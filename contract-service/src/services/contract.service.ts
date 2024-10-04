// contract.service.ts

import { Contract as PrismaContract, PropertyStatus } from '@prisma/client';
import { isAfter, isSameDay } from 'date-fns';
import { v4 } from 'uuid';
import RabbitMQ from '../configs/rabbitmq.config';
import { CONTRACT_QUEUE } from '../constants/rabbitmq';
import { ICancelSmartContractBeforeDeposit, IDeposit, IEndContract, IGetContractInRange } from '../interfaces/contract';
import { IUserId } from '../interfaces/user';
import prisma from '../prisma/prismaClient';
import {
    cancelContractBeforeDeposit,
    cancelContracts,
    createContract as createContractInRepo,
    deposit as depositInRepo,
    findCancelContracts,
    findContractById,
    getContractDetails as getContractDetailsInRepo,
    getContractInRange,
    getContractsByOwner,
    getContractsByRenter,
    getContractTransactions as getContractTransactionsInRepo,
    payMonthlyRent as payMonthlyRentInRepo,
    terminateForNonPayment as terminateForNonPaymentInRepo,
    updateStatusContract,
} from '../repositories/contract.repository';
import { getCancelRequestById } from '../repositories/contractCancellationRequest.repository';
import { updatePropertyStatus } from '../repositories/property.repository';
import {
    cancelTransactions,
    createTransaction,
    getTransactionById,
    paymentTransaction,
} from '../repositories/transaction.repository';
import { findUserById } from '../repositories/user.repository';
import { CreateContractReq } from '../schemas/contract.schema';
import { convertDateToDB } from '../utils/convertDate';
import { dateAfter } from '../utils/dateAfter';
import CustomError from '../utils/error.util';
import { isDateDifferenceMoreThan30Days } from '../utils/isNotificationBefore30Days.util';
import {
    cancelSmartContractBeforeDepositService,
    cancelSmartContractByOwnerService,
    cancelSmartContractByRenterService,
    convertGasToEthService,
    createSmartContractService,
    depositSmartContractService,
    payMonthlyRentSmartContractService,
} from './blockchain.service';
import { getCoinPriceService } from './coingecko.service';

// Hàm để tạo hợp đồng
export const createContractService = async (contract: CreateContractReq): Promise<PrismaContract> => {
    try {
        const [owner, renter] = await Promise.all([
            findUserById(contract.owner_user_id),
            findUserById(contract.renter_user_id),
        ]);

        if (!owner || !owner.wallet_address) {
            throw new CustomError(400, 'Không tìm thấy chủ nhà hoặc chủ nhà chưa có địa chỉ ví.');
        }

        if (!renter || !renter.wallet_address) {
            throw new CustomError(400, 'Không tìm thấy người thuê hoặc người thuê chưa có địa chỉ ví.');
        }

        const contractId = v4();

        const [receipt, ethPrice] = await Promise.all([
            createSmartContractService({
                ...contract,
                contract_id: contractId,
                owner_wallet_address: owner.wallet_address,
                renter_wallet_address: renter.wallet_address,
            }),
            getCoinPriceService(),
        ]);

        const eth = Number(await convertGasToEthService(Number(receipt.gasUsed)));
        const fee = eth * ethPrice;

        const result = await createContractInRepo({
            ...contract,
            owner_wallet_address: owner.wallet_address,
            renter_wallet_address: renter.wallet_address,
            contract_id: contractId,
            transaction_hash: receipt.transactionHash,
        });

        createTransaction({
            from_id: owner.user_id,
            amount: fee,
            contract_id: contractId,
            status: 'COMPLETED',
            title: 'Thanh toán phí tạo hợp đồng',
            description: `Thanh toán phí tạo hợp đồng **${contractId}**`,
            transaction_hash: receipt.transactionHash,
            type: 'CREATE_CONTRACT',
            amount_eth: eth,
        })
            .then(() => console.log('Transaction created'))
            .catch((error) => console.error('Error creating transaction:', error));

        createTransaction({
            from_id: renter.user_id,
            amount: contract.deposit_amount,
            contract_id: contractId,
            title: 'Thanh toán tiền đặt cọc',
            description: `Thanh toán tiền đặt cọc cho hợp đồng **${contractId}**`,
            status: 'PENDING',
            end_date: dateAfter(3, true),
            type: 'DEPOSIT',
        })
            .then(() => console.log('Transaction created'))
            .catch((error) => console.error('Error creating transaction:', error));

        return result;
    } catch (error) {
        console.error('Error creating contract:', error);
        throw new Error('Could not create contract');
    }
};

export const depositService = async ({ contractId, renterId, transactionId }: IDeposit): Promise<PrismaContract> => {
    try {
        const [contract, renter, transaction] = await Promise.all([
            findContractById(contractId),
            findUserById(renterId),
            getTransactionById(transactionId),
        ]);

        if (!transaction) throw new CustomError(404, 'Không tìm thấy giao dịch');
        if (transaction.status !== 'PENDING') throw new CustomError(400, 'Giao dịch đã được xử lý');
        if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');
        if (!renter) throw new CustomError(404, 'Không tìm thấy người thuê');
        if (transaction.contract_id !== contractId) throw new CustomError(400, 'Giao dịch không thuộc hợp đồng này');
        if (contract.renter_user_id !== renterId) throw new CustomError(403, 'Không có quyền thực hiện hành động này');
        if (!renter.wallet_address) throw new CustomError(400, 'Người thuê chưa có địa chỉ ví');

        const contractInRange = await getContractInRange({
            propertyId: contract.property_id,
            rentalEndDate: convertDateToDB(contract.end_date),
            rentalStartDate: convertDateToDB(contract.start_date),
        });

        if (contractInRange) throw new CustomError(400, 'Căn hộ đã được thuê trong khoảng thời gian này');

        const [receipt, ethVnd] = await Promise.all([
            depositSmartContractService({
                contractId,
                renterAddress: renter.wallet_address,
            }),
            getCoinPriceService(),
        ]);

        const feeEth = Number(await convertGasToEthService(Number(receipt.gasUsed)));
        const fee = feeEth * ethVnd;

        const [, , transactionResult] = await prisma.$transaction([
            paymentTransaction({
                amount_eth: transaction.amount / ethVnd,
                fee,
                fee_eth: feeEth,
                id: transactionId,
                transaction_hash: receipt.transactionHash,
            }),
            updatePropertyStatus(contract.property_id, 'UNAVAILABLE'),
            depositInRepo(contractId),
        ]);

        RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
            data: {
                propertyId: contract.property_id,
                status: PropertyStatus.UNAVAILABLE,
            },
            type: CONTRACT_QUEUE.type.UPDATE_STATUS,
        });

        if (isAfter(new Date(), contract.start_date) || isSameDay(new Date(), contract.start_date)) {
            createTransaction({
                amount: contract.monthly_rent,
                contract_id: contract.contract_id,
                status: 'PENDING',
                title: `Thanh toán tiền thuê tháng ${contract.start_date.getMonth() + 1}`,
                description: `Thanh toán tiền thuê tháng ${contract.start_date.getMonth() + 1} cho hợp đồng **${
                    contract.contract_id
                }**`,
                from_id: contract.renter_user_id,
                to_id: contract.owner_user_id,
                end_date: dateAfter(14, true),
                type: 'RENT',
            })
                .then(() => console.log('Transaction created'))
                .catch((error) => console.error('Error creating transaction:', error));
        }

        const data = {
            propertyId: contract.property_id,
            rentalEndDate: convertDateToDB(contract.end_date),
            rentalStartDate: convertDateToDB(contract.start_date),
        };

        Promise.all([findCancelContracts(data), cancelContracts(data)])
            .then(([contracts]) => {
                const contractIds = contracts.map((contract) => contract.contract_id);

                return cancelTransactions(contractIds);
            })
            .then(() => console.log('Transactions cancelled'))
            .catch((error) => console.error('Error cancelling transactions:', error));

        return transactionResult;
    } catch (error) {
        console.error('Error processing deposit and creating contract:', error);
        throw error;
    }
};

// Hàm để thanh toán tiền thuê hàng tháng
export const payMonthlyRentService = async ({ contractId, renterId, transactionId }: IDeposit) => {
    try {
        // Lấy thông tin hợp đồng từ cơ sở dữ liệu
        const [contract, renter, transaction] = await Promise.all([
            findContractById(contractId),
            findUserById(renterId),
            getTransactionById(transactionId),
        ]);

        if (!transaction) throw new CustomError(404, 'Không tìm thấy giao dịch');
        if (transaction.status !== 'PENDING') throw new CustomError(400, 'Giao dịch đã được xử lý');
        if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');
        if (!renter) throw new CustomError(404, 'Không tìm thấy người thuê');
        if (!renter.wallet_address) throw new CustomError(400, 'Người thuê chưa có địa chỉ ví');
        if (contract.renter_user_id !== renterId) throw new CustomError(403, 'Không có quyền thực hiện hành động này');

        const [receipt, ethVnd] = await Promise.all([
            payMonthlyRentSmartContractService({
                contractId,
                renterAddress: renter.wallet_address,
            }),
            getCoinPriceService(),
        ]);

        const feeEth = Number(await convertGasToEthService(Number(receipt.gasUsed)));
        const fee = feeEth * ethVnd;

        const [transactionResult] = await prisma.$transaction([
            paymentTransaction({
                amount_eth: transaction.amount / ethVnd,
                fee,
                fee_eth: feeEth,
                id: transactionId,
                transaction_hash: receipt.transactionHash,
            }),
            payMonthlyRentInRepo(contractId),
        ]);

        // Gọi phương thức repository để thực hiện thanh toán tiền thuê
        return transactionResult;
    } catch (error) {
        console.error('Error processing monthly rent payment:', error);
        throw new Error('Could not process monthly rent payment');
    }
};

// // Hàm để hủy hợp đồng bởi người thuê
// export const cancelContractByRenterService = async (
//     contractId: string,
//     renterUserId: IUserId,
//     cancellationDate: Date,
// ): Promise<PrismaContract> => {
//     try {
//         const [contract, renter] = await Promise.all([findContractById(contractId), findUserById(renterUserId)]);

//         if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');

//         if (!renter || !renter.wallet_address)
//             throw new CustomError(404, 'Không tìm thấy người thuê hoặc người thuê chưa có địa chỉ ví');

//         const notifyBefore30Days = isNotificationBefore30Days(cancellationDate);

//         const receipt = await cancelSmartContractByRenterService({
//             contractId,
//             notifyBefore30Days,
//             renterAddress: renter.wallet_address,
//         });

//         const ethVnd = await getCoinPriceService({
//             coin: 'ethereum',
//             currency: 'vnd',
//         });

//         const queries = [];

//         if (notifyBefore30Days) {
//             queries.push(
//                 createTransaction({
//                     amount: contract.deposit_amount,
//                     contract_id: contractId,
//                     status: 'COMPLETED',
//                     title: 'Hoàn trả tiền đặt cọc',
//                     description: `Hoàn trả tiền đặt cọc cho hợp đồng **${contractId}**`,
//                     to_id: renterUserId,
//                     amount_eth: contract.deposit_amount / ethVnd,
//                     fee: Number(receipt.gasUsed) / 1e18,
//                     transaction_hash: receipt.transactionHash,
//                 }),
//             );
//         } else {
//             queries.push(
//                 createTransaction({
//                     amount: contract.deposit_amount,
//                     contract_id: contractId,
//                     status: 'COMPLETED',
//                     title: 'Thanh toán tiền đặt cọc cho chủ nhà',
//                     description: `Thanh toán tiền đặt cọc cho hợp đồng **${contractId}**`,
//                     to_id: contract.owner_user_id,
//                     amount_eth: contract.deposit_amount / ethVnd,
//                     fee: Number(receipt.gasUsed) / 1e18,
//                     transaction_hash: receipt.transactionHash,
//                 }),
//             );
//         }

//         // // Cập nhật trạng thái property trong cơ sở dữ liệu
//         // await prisma.property.update({
//         //     where: { property_id: contract.property_id },
//         //     data: {
//         //         status: PropertyStatus.ACTIVE, // Hoặc trạng thái phù hợp với yêu cầu của bạn
//         //     },
//         // });

//         // RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
//         //     data: {
//         //         propertyId: contract.property_id,
//         //         status: PropertyStatus.ACTIVE,
//         //     },
//         //     type: CONTRACT_QUEUE.type.UPDATE_STATUS,
//         // });

//         // Gọi phương thức repository để thực hiện hủy hợp đồng
//         return await cancelContractByRenterInRepo(contractId, renterUserId, cancellationDate);
//     } catch (error) {
//         console.error('Error processing contract cancellation:', error);
//         throw new Error('Could not process contract cancellation');
//     }
// };

// // Hàm để hủy hợp đồng bởi chủ nhà
// export const cancelContractByOwnerService = async (
//     contractId: string,
//     ownerUserId: IUserId,
//     cancellationDate: Date,
// ): Promise<PrismaContract> => {
//     try {
//         // Gọi phương thức repository để thực hiện hủy hợp đồng
//         return await cancelContractByOwnerInRepo(contractId, ownerUserId, cancellationDate);
//     } catch (error) {
//         console.error('Error processing contract cancellation:', error);
//         throw new Error('Could not process contract cancellation');
//     }
// };

// Hàm để lấy danh sách giao dịch của hợp đồng từ blockchain
export const getContractTransactionsService = async (contractId: string, userId: IUserId): Promise<any[]> => {
    try {
        // Gọi phương thức repository để lấy danh sách giao dịch
        return await getContractTransactionsInRepo(contractId, userId);
    } catch (error) {
        console.error('Error fetching contract transactions:', error);
        throw new Error('Could not fetch contract transactions');
    }
};

// Hàm để lấy chi tiết hợp đồng
export const getContractDetailsService = async (contractId: string, userId: IUserId): Promise<any> => {
    try {
        // Gọi phương thức repository để lấy chi tiết hợp đồng
        return await getContractDetailsInRepo(contractId, userId);
    } catch (error) {
        console.error('Error fetching contract details:', error);
        throw new Error('Could not fetch contract details');
    }
};

// Hàm để hủy hợp đồng do không thanh toán
export const terminateForNonPaymentService = async (
    contractId: string,
    ownerUserId: string,
): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để thực hiện hủy hợp đồng do không thanh toán
        return await terminateForNonPaymentInRepo(contractId, ownerUserId);
    } catch (error) {
        console.error('Error terminating contract for non-payment:', error);
        throw new Error('Could not terminate contract for non-payment');
    }
};

export const getContractsByOwnerService = async (ownerId: IUserId): Promise<PrismaContract[]> => {
    try {
        return await getContractsByOwner(ownerId);
    } catch (error) {
        console.error('Error getting contracts by owner:', error);
        throw new CustomError(400, 'Không thể lấy danh sách hợp đồng');
    }
};

export const getContractsByRenterService = async (renterId: IUserId): Promise<PrismaContract[]> => {
    try {
        return await getContractsByRenter(renterId);
    } catch (error) {
        console.error('Error getting contracts by renter:', error);
        throw new CustomError(400, 'Không thể lấy danh sách hợp đồng');
    }
};

export const getContractInRangeService = (params: IGetContractInRange) => {
    return getContractInRange(params);
};

export const cancelContractBeforeDepositService = async ({ contractId, userId }: ICancelSmartContractBeforeDeposit) => {
    try {
        const [contract, user] = await Promise.all([findContractById(contractId), findUserById(userId)]);

        if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');
        if (!user) throw new CustomError(404, 'Không tìm thấy người dùng');
        if (!user.wallet_address) throw new CustomError(400, 'Người dùng chưa có địa chỉ ví');

        if (contract.owner_user_id !== userId && contract.renter_user_id !== userId)
            throw new CustomError(403, 'Không có quyền thực hiện hành động này');

        const [receipt, ethVnd] = await Promise.all([
            cancelSmartContractBeforeDepositService({
                contractId,
                userAddress: user.wallet_address,
            }),
            getCoinPriceService(),
        ]);
        const eth = Number(await convertGasToEthService(Number(receipt.gasUsed)));
        const fee = eth * ethVnd;

        cancelTransactions([contractId])
            .then(() =>
                createTransaction({
                    amount: fee,
                    contract_id: contractId,
                    status: 'COMPLETED',
                    title: 'Phí hủy hợp đồng',
                    type: 'CANCEL_CONTRACT',
                    amount_eth: eth,
                    transaction_hash: receipt.transactionHash,
                    description: `Thanh toán phí hủy hợp đồng **${contractId}**`,
                    from_id: userId,
                }),
            )
            .then(() => console.log('Transaction cancelled'))
            .catch((error) => console.error('Error creating transaction:', error));

        return cancelContractBeforeDeposit({
            contractId,
            userId,
        });
    } catch (error) {
        console.error('Error cancelling contract before deposit:', error);
        throw new Error('Could not cancel contract before deposit');
    }
};

export const endContractService = async ({ contractId, id: requestId }: IEndContract) => {
    try {
        const [contract, request] = await Promise.all([findContractById(contractId), getCancelRequestById(requestId)]);

        if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');
        if (!request) throw new CustomError(404, 'Không tìm thấy yêu cầu hủy hợp đồng');

        const user = await findUserById(request.requestedBy);

        if (!user) throw new CustomError(404, 'Không tìm thấy người dùng');
        if (!user.wallet_address) throw new CustomError(400, 'Người dùng chưa có địa chỉ ví');

        const requestByOwner = request.requestedBy === contract.owner_user_id;
        const notifyBefore30Days =
            request.status === 'APPROVED' || isDateDifferenceMoreThan30Days(request.cancelDate, request.requestedAt);
        console.log('🚀 ~ endContractService ~ notifyBefore30Days:', notifyBefore30Days);

        const { receipt, indemnity } = await (requestByOwner
            ? cancelSmartContractByOwnerService
            : cancelSmartContractByRenterService)({
            contractId,
            userAddress: user.wallet_address,
            notifyBefore30Days,
        });

        const [ethVnd, feeEth, feeIndemnity] = await Promise.all([
            getCoinPriceService(),
            convertGasToEthService(Number(receipt.gasUsed)),
            indemnity ? convertGasToEthService(Number(indemnity.gasUsed)) : 0,
        ]);

        const isRefund = notifyBefore30Days || requestByOwner;
        const fee = Number(feeEth) * ethVnd;

        const queries = [
            updatePropertyStatus(contract.property_id, 'ACTIVE'),
            updateStatusContract(contractId, 'ENDED'),
            createTransaction({
                amount: contract.deposit_amount,
                contract_id: contract.contract_id,
                status: 'COMPLETED',
                title: isRefund ? `Hoàn trả tiền đặt cọc` : `Thanh toán tiền đặt cọc cho chủ nhà`,
                description: isRefund
                    ? `Hoàn trả tiền đặt cọc cho hợp đồng **${contract.contract_id}**`
                    : `Thanh toán tiền đặt cọc cho hợp đồng **${contract.contract_id}**`,
                to_id: isRefund ? contract.renter_user_id : contract.owner_user_id,
                type: isRefund ? 'REFUND' : 'DEPOSIT',
                amount_eth: contract.deposit_amount / ethVnd,
                transaction_hash: receipt.transactionHash,
                fee: Number(fee),
                fee_eth: Number(feeEth),
            }),
            cancelTransactions([contractId]),
        ];

        if (indemnity) {
            const fee = Number(feeIndemnity) * ethVnd;

            queries.push(
                createTransaction({
                    amount: contract.monthly_rent,
                    contract_id: contract.contract_id,
                    status: 'COMPLETED',
                    title: 'Bồi thường tiền huỷ hợp đồng',
                    description: `Bồi thường tiền huỷ hợp đồng **${contract.contract_id}**`,
                    to_id: contract.renter_user_id,
                    type: 'COMPENSATION',
                    amount_eth: contract.monthly_rent / ethVnd,
                    transaction_hash: receipt.transactionHash,
                    from_id: contract.owner_user_id,
                    fee,
                    fee_eth: Number(feeIndemnity),
                }),
            );
        }

        await prisma.$transaction(queries);

        RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
            data: {
                propertyId: contract.property_id,
                status: PropertyStatus.ACTIVE,
            },
            type: CONTRACT_QUEUE.type.UPDATE_STATUS,
        });
    } catch (error) {
        throw error;
    }
};
