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
        const [owner, renter] = await Promise.all([findUserById(contract.ownerId), findUserById(contract.renterId)]);

        if (!owner || !owner.walletAddress) {
            throw new CustomError(400, 'Không tìm thấy chủ nhà hoặc chủ nhà chưa có địa chỉ ví.');
        }

        if (!renter || !renter.walletAddress) {
            throw new CustomError(400, 'Không tìm thấy người thuê hoặc người thuê chưa có địa chỉ ví.');
        }

        const contractId = v4();

        const [receipt, ethPrice] = await Promise.all([
            createSmartContractService({
                ...contract,
                contractId: contractId,
                ownerWalletAddress: owner.walletAddress,
                renterWalletAddress: renter.walletAddress,
            }),
            getCoinPriceService(),
        ]);

        const eth = Number(await convertGasToEthService(Number(receipt.gasUsed)));
        const fee = eth * ethPrice;

        const result = await createContractInRepo({
            ...contract,
            ownerWalletAddress: owner.walletAddress,
            renterWalletAddress: renter.walletAddress,
            contractId: contractId,
            transactionHash: receipt.transactionHash,
        });

        createTransaction({
            fromId: owner.userId,
            amount: fee,
            contractId: contractId,
            status: 'COMPLETED',
            title: 'Thanh toán phí tạo hợp đồng',
            description: `Thanh toán phí tạo hợp đồng **${contractId}**`,
            transactionHash: receipt.transactionHash,
            type: 'CREATE_CONTRACT',
            amountEth: eth,
        })
            .then(() => console.log('Transaction created'))
            .catch((error) => console.error('Error creating transaction:', error));

        createTransaction({
            fromId: renter.userId,
            amount: contract.depositAmount,
            contractId: contractId,
            title: 'Thanh toán tiền đặt cọc',
            description: `Thanh toán tiền đặt cọc cho hợp đồng **${contractId}**`,
            status: 'PENDING',
            endDate: dateAfter(3, true),
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
        if (transaction.contractId !== contractId) throw new CustomError(400, 'Giao dịch không thuộc hợp đồng này');
        if (contract.renterId !== renterId) throw new CustomError(403, 'Không có quyền thực hiện hành động này');
        if (!renter.walletAddress) throw new CustomError(400, 'Người thuê chưa có địa chỉ ví');

        const contractInRange = await getContractInRange({
            propertyId: contract.propertyId,
            rentalEndDate: convertDateToDB(contract.endDate),
            rentalStartDate: convertDateToDB(contract.startDate),
        });

        if (contractInRange) throw new CustomError(400, 'Căn hộ đã được thuê trong khoảng thời gian này');

        const [receipt, ethVnd] = await Promise.all([
            depositSmartContractService({
                contractId,
                renterAddress: renter.walletAddress,
            }),
            getCoinPriceService(),
        ]);

        const feeEth = Number(await convertGasToEthService(Number(receipt.gasUsed)));
        const fee = feeEth * ethVnd;

        const [, , transactionResult] = await prisma.$transaction([
            paymentTransaction({
                amountEth: transaction.amount / ethVnd,
                fee,
                feeEth: feeEth,
                id: transactionId,
                transactionHash: receipt.transactionHash,
            }),
            updatePropertyStatus(contract.propertyId, 'UNAVAILABLE'),
            depositInRepo(contractId),
        ]);

        RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
            data: {
                propertyId: contract.propertyId,
                status: PropertyStatus.UNAVAILABLE,
            },
            type: CONTRACT_QUEUE.type.UPDATE_STATUS,
        });

        if (isAfter(new Date(), contract.startDate) || isSameDay(new Date(), contract.startDate)) {
            createTransaction({
                amount: contract.monthlyRent,
                contractId: contract.contractId,
                status: 'PENDING',
                title: `Thanh toán tiền thuê tháng ${contract.startDate.getMonth() + 1}`,
                description: `Thanh toán tiền thuê tháng ${contract.startDate.getMonth() + 1} cho hợp đồng **${
                    contract.contractId
                }**`,
                fromId: contract.renterId,
                toId: contract.ownerId,
                endDate: dateAfter(14, true),
                type: 'RENT',
            })
                .then(() => console.log('Transaction created'))
                .catch((error) => console.error('Error creating transaction:', error));
        }

        const data = {
            propertyId: contract.propertyId,
            rentalEndDate: convertDateToDB(contract.endDate),
            rentalStartDate: convertDateToDB(contract.startDate),
        };

        Promise.all([findCancelContracts(data), cancelContracts(data)])
            .then(([contracts]) => {
                const contractIds = contracts.map((contract) => contract.contractId);

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
        if (!renter.walletAddress) throw new CustomError(400, 'Người thuê chưa có địa chỉ ví');
        if (contract.renterId !== renterId) throw new CustomError(403, 'Không có quyền thực hiện hành động này');

        const [receipt, ethVnd] = await Promise.all([
            payMonthlyRentSmartContractService({
                contractId,
                renterAddress: renter.walletAddress,
            }),
            getCoinPriceService(),
        ]);

        const feeEth = Number(await convertGasToEthService(Number(receipt.gasUsed)));
        const fee = feeEth * ethVnd;

        const [transactionResult] = await prisma.$transaction([
            paymentTransaction({
                amountEth: transaction.amount / ethVnd,
                fee,
                feeEth: feeEth,
                id: transactionId,
                transactionHash: receipt.transactionHash,
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
//     ren.renterId: IUserId,
//     cancellationDate: Date,
// ): Promise<PrismaContract> => {
//     try {
//         const [contract, renter] = await Promise.all([findContractById(contractId), findUserById(ren.renterId)]);

//         if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');

//         if (!renter || !renter.walletAddress)
//             throw new CustomError(404, 'Không tìm thấy người thuê hoặc người thuê chưa có địa chỉ ví');

//         const notifyBefore30Days = isNotificationBefore30Days(cancellationDate);

//         const receipt = await cancelSmartContractByRenterService({
//             contractId,
//             notifyBefore30Days,
//             renterAddress: renter.walletAddress,
//         });

//         const ethVnd = await getCoinPriceService({
//             coin: 'ethereum',
//             currency: 'vnd',
//         });

//         const queries = [];

//         if (notifyBefore30Days) {
//             queries.push(
//                 createTransaction({
//                     amount: contract.depositAmount,
//                     contractId: contractId,
//                     status: 'COMPLETED',
//                     title: 'Hoàn trả tiền đặt cọc',
//                     description: `Hoàn trả tiền đặt cọc cho hợp đồng **${contractId}**`,
//                     to_id: ren.renterId,
//                     amountEth: contract.depositAmount/ ethVnd,
//                     fee: Number(receipt.gasUsed) / 1e18,
//                     transactionHash: receipt.transactionHash,
//                 }),
//             );
//         } else {
//             queries.push(
//                 createTransaction({
//                     amount: contract.depositAmount,
//                     contractId: contractId,
//                     status: 'COMPLETED',
//                     title: 'Thanh toán tiền đặt cọc cho chủ nhà',
//                     description: `Thanh toán tiền đặt cọc cho hợp đồng **${contractId}**`,
//                     to_id: contract.owner,
//                     amountEth: contract.depositAmount/ ethVnd,
//                     fee: Number(receipt.gasUsed) / 1e18,
//                     transactionHash: receipt.transactionHash,
//                 }),
//             );
//         }

//         // // Cập nhật trạng thái property trong cơ sở dữ liệu
//         // await prisma.property.update({
//         //     where: { property_id: contract.propertyId},
//         //     data: {
//         //         status: PropertyStatus.ACTIVE, // Hoặc trạng thái phù hợp với yêu cầu của bạn
//         //     },
//         // });

//         // RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
//         //     data: {
//         //         propertyId: contract.propertyId,
//         //         status: PropertyStatus.ACTIVE,
//         //     },
//         //     type: CONTRACT_QUEUE.type.UPDATE_STATUS,
//         // });

//         // Gọi phương thức repository để thực hiện hủy hợp đồng
//         return await cancelContractByRenterInRepo(contractId, ren.renterId, cancellationDate);
//     } catch (error) {
//         console.error('Error processing contract cancellation:', error);
//         throw new Error('Could not process contract cancellation');
//     }
// };

// // Hàm để hủy hợp đồng bởi chủ nhà
// export const cancelContractByOwnerService = async (
//     contractId: string,
//     owner: IUserId,
//     cancellationDate: Date,
// ): Promise<PrismaContract> => {
//     try {
//         // Gọi phương thức repository để thực hiện hủy hợp đồng
//         return await cancelContractByOwnerInRepo(contractId, owner, cancellationDate);
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
export const terminateForNonPaymentService = async (contractId: string, owner: string): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để thực hiện hủy hợp đồng do không thanh toán
        return await terminateForNonPaymentInRepo(contractId, owner);
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
        if (!user.walletAddress) throw new CustomError(400, 'Người dùng chưa có địa chỉ ví');

        if (contract.ownerId !== userId && contract.renterId !== userId)
            throw new CustomError(403, 'Không có quyền thực hiện hành động này');

        const [receipt, ethVnd] = await Promise.all([
            cancelSmartContractBeforeDepositService({
                contractId,
                userAddress: user.walletAddress,
            }),
            getCoinPriceService(),
        ]);
        const eth = Number(await convertGasToEthService(Number(receipt.gasUsed)));
        const fee = eth * ethVnd;

        cancelTransactions([contractId])
            .then(() =>
                createTransaction({
                    amount: fee,
                    contractId: contractId,
                    status: 'COMPLETED',
                    title: 'Phí hủy hợp đồng',
                    type: 'CANCEL_CONTRACT',
                    amountEth: eth,
                    transactionHash: receipt.transactionHash,
                    description: `Thanh toán phí hủy hợp đồng **${contractId}**`,
                    fromId: userId,
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
        if (!user.walletAddress) throw new CustomError(400, 'Người dùng chưa có địa chỉ ví');

        const requestByOwner = request.requestedBy === contract.ownerId;
        const notifyBefore30Days =
            request.status === 'APPROVED' || isDateDifferenceMoreThan30Days(request.cancelDate, request.requestedAt);
        console.log('🚀 ~ endContractService ~ notifyBefore30Days:', notifyBefore30Days);

        const { receipt, indemnity } = await (requestByOwner
            ? cancelSmartContractByOwnerService
            : cancelSmartContractByRenterService)({
            contractId,
            userAddress: user.walletAddress,
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
            updatePropertyStatus(contract.propertyId, 'ACTIVE'),
            updateStatusContract(contractId, 'ENDED'),
            createTransaction({
                amount: contract.depositAmount,
                contractId: contract.contractId,
                status: 'COMPLETED',
                title: isRefund ? `Hoàn trả tiền đặt cọc` : `Thanh toán tiền đặt cọc cho chủ nhà`,
                description: isRefund
                    ? `Hoàn trả tiền đặt cọc cho hợp đồng **${contract.contractId}**`
                    : `Thanh toán tiền đặt cọc cho hợp đồng **${contract.contractId}**`,
                toId: isRefund ? contract.renterId : contract.ownerId,
                type: isRefund ? 'REFUND' : 'DEPOSIT',
                amountEth: contract.depositAmount / ethVnd,
                transactionHash: receipt.transactionHash,
                fee: Number(fee),
                feeEth: Number(feeEth),
            }),
            cancelTransactions([contractId]),
        ];

        if (indemnity) {
            const fee = Number(feeIndemnity) * ethVnd;

            queries.push(
                createTransaction({
                    amount: contract.monthlyRent,
                    contractId: contract.contractId,
                    status: 'COMPLETED',
                    title: 'Bồi thường tiền huỷ hợp đồng',
                    description: `Bồi thường tiền huỷ hợp đồng **${contract.contractId}**`,
                    toId: contract.renterId,
                    type: 'COMPENSATION',
                    amountEth: contract.monthlyRent / ethVnd,
                    transactionHash: receipt.transactionHash,
                    fromId: contract.ownerId,
                    fee,
                    feeEth: Number(feeIndemnity),
                }),
            );
        }

        await prisma.$transaction(queries);

        RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
            data: {
                propertyId: contract.propertyId,
                status: PropertyStatus.ACTIVE,
            },
            type: CONTRACT_QUEUE.type.UPDATE_STATUS,
        });
    } catch (error) {
        throw error;
    }
};
