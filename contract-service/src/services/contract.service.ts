// contract.service.ts

import { Contract, Contract as PrismaContract, PropertyStatus, RentalRequest } from '@prisma/client';
import { isAfter, isSameDay } from 'date-fns';
import { v4 } from 'uuid';
import RabbitMQ from '../configs/rabbitmq.config';
import { CONTRACT_QUEUE, SYNC_MESSAGE_QUEUE_CONTRACT } from '../constants/rabbitmq';
import {
    ICancelSmartContractBeforeDeposit,
    IContractId,
    IDeposit,
    IEndContract,
    IGenerateContract,
    IGetContractDetail,
    IGetContractInRange,
} from '../interfaces/contract';
import { IPagination, IPaginationResponse } from '../interfaces/pagination';
import { IOwnerUpdateRentalRequestStatus } from '../interfaces/rentalRequest';
import { IUserId } from '../interfaces/user';
import prisma from '../prisma/prismaClient';
import {
    cancelContractBeforeDeposit,
    cancelContracts,
    countContractsByOwner,
    countContractsByRenter,
    createContract as createContractInRepo,
    deposit as depositInRepo,
    findCancelContracts,
    findContractById,
    getContractById,
    getContractDetail as getContractDetailInRepo,
    getContractInRange,
    getContractsByOwner,
    getContractsByRenter,
    payMonthlyRent as payMonthlyRentInRepo,
    updateStatusContract,
} from '../repositories/contract.repository';
import {
    cancelRequestWhenEndContract,
    getCancelRequestById,
} from '../repositories/contractCancellationRequest.repository';
import { cancelExtensionRequestWhenEndContract } from '../repositories/contractExtensionRequest.repository';
import { updatePropertyStatus } from '../repositories/property.repository';
import { ownerUpdateRentalRequestStatus } from '../repositories/rentalRequest.repository';
import {
    cancelTransactions,
    cancelTransactionsWhenEndContract,
    createTransaction,
    findDepositedTransaction,
    getTransactionById,
    paymentTransaction,
} from '../repositories/transaction.repository';
import { findUserById } from '../repositories/user.repository';
import { CreateContractReq } from '../schemas/contract.schema';
import { convertDateToDB } from '../utils/convertDate';
import convertDateToString from '../utils/convertDateToString.util';
import { createContract } from '../utils/createContract.util';
import { dateAfter } from '../utils/dateAfter';
import CustomError from '../utils/error.util';
import getPageInfo from '../utils/getPageInfo';
import { isDateDifferenceMoreThan30Days } from '../utils/isNotificationBefore30Days.util';
import {
    cancelSmartContractBeforeDepositService,
    cancelSmartContractByOwnerService,
    cancelSmartContractByRenterService,
    convertGasToEthService,
    createSmartContractService,
    depositSmartContractService,
    endSmartContractService,
    payMonthlyRentSmartContractService,
} from './blockchain.service';
import { getCoinPriceService } from './coingecko.service';
import { getPropertyByIdService } from './property.service';
import { createNotificationQueue } from './rabbitmq.service';
import { findUserDetailByUserIdService } from './user.service';

export const createContractAndApprovalRequestService = async (
    contract: CreateContractReq,
    updatedRequest?: IOwnerUpdateRentalRequestStatus,
) => {
    try {
        const [owner, renter] = await Promise.all([findUserById(contract.ownerId), findUserById(contract.renterId)]);

        if (!owner || !owner.walletAddress) {
            throw new CustomError(400, 'Không tìm thấy chủ nhà hoặc chủ nhà chưa có địa chỉ ví.');
        }

        if (!renter || !renter.walletAddress) {
            throw new CustomError(400, 'Không tìm thấy người thuê hoặc người thuê chưa có địa chỉ ví.');
        }

        const contractId = v4();
        const contractTerms = contract.contractTerms.replaceAll(' class="mceEditable"', '');

        const [receipt, ethPrice] = await Promise.all([
            createSmartContractService({
                ...contract,
                contractId: contractId,
                ownerWalletAddress: owner.walletAddress,
                renterWalletAddress: renter.walletAddress,
                contractTerms,
            }),
            getCoinPriceService(),
        ]);

        const eth = Number(await convertGasToEthService(Number(receipt.gasUsed)));
        const fee = eth * ethPrice;

        const [result] = await (updatedRequest?.requestId
            ? prisma.$transaction([
                  createContractInRepo({
                      ...contract,
                      ownerWalletAddress: owner.walletAddress,
                      renterWalletAddress: renter.walletAddress,
                      contractId: contractId,
                      transactionHash: receipt.transactionHash,
                      contractTerms,
                  }),
                  ownerUpdateRentalRequestStatus(updatedRequest),
              ])
            : Promise.all([
                  createContractInRepo({
                      ...contract,
                      ownerWalletAddress: owner.walletAddress,
                      renterWalletAddress: renter.walletAddress,
                      contractId: contractId,
                      transactionHash: receipt.transactionHash,
                      contractTerms,
                  }),
              ]));

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
            .then(() =>
                createNotificationQueue({
                    body: `Thanh toán tiền đặt cọc cho hợp đồng **${contractId}**`,
                    title: 'Thanh toán tiền đặt cọc',
                    type: 'RENTER_PAYMENT',
                    docId: contractId,
                    to: renter.userId,
                }),
            )
            .then(() => console.log('Transaction created'))
            .catch((error) => console.error('Error creating transaction:', error));

        return result;
    } catch (error) {
        console.error('Error creating contract:', error);
        throw new Error('Could not create contract');
    }
};

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
        const contractTerms = contract.contractTerms.replaceAll(' class="mceEditable"', '');

        const [receipt, ethPrice] = await Promise.all([
            createSmartContractService({
                ...contract,
                contractId: contractId,
                ownerWalletAddress: owner.walletAddress,
                renterWalletAddress: renter.walletAddress,
                contractTerms,
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
            contractTerms,
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

        const isStartRent = isAfter(new Date(), contract.startDate) || isSameDay(new Date(), contract.startDate);

        const [, transactionResult] = await prisma.$transaction([
            paymentTransaction({
                amountEth: transaction.amount / ethVnd,
                fee,
                feeEth: feeEth,
                id: transactionId,
                transactionHash: receipt.transactionHash,
            }),
            depositInRepo(contractId),
            ...(isStartRent ? [updatePropertyStatus(contract.propertyId, 'UNAVAILABLE')] : []),
        ]);

        if (isStartRent) {
            RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
                data: {
                    propertyId: contract.propertyId,
                    status: PropertyStatus.UNAVAILABLE,
                },
                type: CONTRACT_QUEUE.type.UPDATE_STATUS,
            });
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
                .then(() =>
                    createNotificationQueue({
                        body: `Thanh toán tiền thuê tháng ${contract.startDate.getMonth() + 1} cho hợp đồng **${
                            contract.contractId
                        }**`,
                        title: 'Thanh toán tiền thuê',
                        type: 'RENTER_PAYMENT',
                        docId: contract.contractId,
                        to: contract.renterId,
                    }),
                )
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

        return transactionResult as PrismaContract;
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

// Hàm để lấy chi tiết hợp đồng
export const getContractDetailService = async (params: IGetContractDetail): Promise<any> => {
    try {
        // Gọi phương thức repository để lấy chi tiết hợp đồng
        const contract = await getContractDetailInRepo(params);

        if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');

        const property = await RabbitMQ.getInstance().sendSyncMessage({
            queue: SYNC_MESSAGE_QUEUE_CONTRACT.name,
            message: {
                type: SYNC_MESSAGE_QUEUE_CONTRACT.type.GET_PROPERTY_DETAIL,
                data: contract.propertyId,
            },
        });

        return {
            ...contract,
            property: JSON.parse(property),
        };
    } catch (error) {
        console.error('Error fetching contract details:', error);
        throw new Error('Could not fetch contract details');
    }
};

export const getContractsByOwnerService = async (ownerId: IUserId, pagination: IPagination) => {
    try {
        const [contracts, count] = await Promise.all([
            getContractsByOwner(ownerId, pagination),
            countContractsByOwner(ownerId),
        ]);

        const result: IPaginationResponse<PrismaContract> = {
            data: contracts,
            pageInfo: getPageInfo({
                ...pagination,
                count,
            }),
        };

        return result;
    } catch (error) {
        console.error('Error getting contracts by owner:', error);
        throw new CustomError(400, 'Không thể lấy danh sách hợp đồng');
    }
};

export const getContractsByRenterService = async (renterId: IUserId, pagination: IPagination) => {
    try {
        const [contracts, count] = await Promise.all([
            getContractsByRenter(renterId, pagination),
            countContractsByRenter(renterId),
        ]);

        const result: IPaginationResponse<PrismaContract> = {
            data: contracts,
            pageInfo: getPageInfo({
                ...pagination,
                count,
            }),
        };

        return result;
    } catch (error) {
        console.error('Error getting contracts by renter:', error);
        throw new CustomError(400, 'Không thể lấy danh sách hợp đồng');
    }
};

export const getContractInRangeService = (params: IGetContractInRange) => {
    return getContractInRange(params);
};

export const cancelContractBeforeDepositService = async ({
    contractId,
    userId,
    isOverdue,
}: ICancelSmartContractBeforeDeposit) => {
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

        if (isOverdue) {
            // Send notification to owner
            createNotificationQueue({
                body: `Hợp đồng **${contract.contractId}** đã bị hủy do quá hạn đặt cọc`,
                title: 'Hợp đồng bị hủy',
                type: 'OWNER_CONTRACT',
                docId: contract.contractId,
                to: contract.ownerId,
            }).catch((error) => {
                console.error('Error sending notification:', error);
            });

            // Send notification to renter
            createNotificationQueue({
                body: `Hợp đồng **${contract.contractId}** đã bị hủy do quá hạn đặt cọc`,
                title: 'Hợp đồng bị hủy',
                type: 'RENTER_CONTRACT',
                docId: contract.contractId,
                to: contract.renterId,
            }).catch((error) => {
                console.error('Error sending notification:', error);
            });
        }

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
        const [contract, request, transaction] = await Promise.all([
            findContractById(contractId),
            getCancelRequestById(requestId),
            findDepositedTransaction(contractId),
        ]);

        if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');
        if (!request) throw new CustomError(404, 'Không tìm thấy yêu cầu hủy hợp đồng');
        if (!transaction) throw new CustomError(404, 'Không tìm thấy giao dịch đặt cọc');

        const [user, renter] = await Promise.all([findUserById(request.requestedBy), findUserById(contract.renterId)]);

        if (!user) throw new CustomError(404, 'Không tìm thấy người dùng');
        if (!user.walletAddress) throw new CustomError(400, 'Người dùng chưa có địa chỉ ví');

        const requestByOwner = request.requestedBy === contract.ownerId;
        const notifyBefore30Days =
            request.status === 'APPROVED' || isDateDifferenceMoreThan30Days(request.cancelDate, request.requestedAt);
        console.log('🚀 ~ endContractService ~ notifyBefore30Days:', notifyBefore30Days);

        const { receipt, indemnity, indemnityEth } = await (requestByOwner
            ? cancelSmartContractByOwnerService({
                  contractId,
                  userAddress: user.walletAddress,
                  notifyBefore30Days,
                  renterAddress: renter?.walletAddress!,
                  depositAmountEth: transaction.amountEth || 0,
              })
            : cancelSmartContractByRenterService({
                  contractId,
                  userAddress: user.walletAddress,
                  notifyBefore30Days,
                  depositAmountEth: transaction.amountEth || 0,
              }));

        const [ethVnd, feeEth, feeIndemnity] = await Promise.all([
            getCoinPriceService(),
            convertGasToEthService(Number(receipt.gasUsed)),
            indemnity ? convertGasToEthService(Number(indemnity.gasUsed)) : 0,
        ]);

        const isRefund = notifyBefore30Days || requestByOwner;
        const fee = Number(feeEth) * ethVnd;

        const queries = [
            updateStatusContract(contractId, 'ENDED'),
            updatePropertyStatus(contract.propertyId, 'ACTIVE'),
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
                amountEth: transaction.amountEth || 0,
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
                    amountEth: indemnityEth || undefined,
                    contractId: contract.contractId,
                    status: 'COMPLETED',
                    title: 'Bồi thường tiền huỷ hợp đồng',
                    description: `Bồi thường tiền huỷ hợp đồng **${contract.contractId}**`,
                    toId: contract.renterId,
                    type: 'COMPENSATION',
                    transactionHash: indemnity.transactionHash,
                    // fromId: contract.ownerId,
                    // fee,
                    // feeEth: Number(feeIndemnity),
                }),
            );

            queries.push(
                createTransaction({
                    amount: fee,
                    amountEth: Number(feeIndemnity),
                    contractId: contract.contractId,
                    status: 'COMPLETED',
                    title: 'Phí bồi thường tiền huỷ hợp đồng cho người thuê',
                    type: 'COMPENSATION',
                    transactionHash: indemnity.transactionHash,
                    description: `Thanh toán phí bồi thường tiền huỷ hợp đồng **${contract.contractId}**`,
                    fromId: contract.ownerId,
                }),
            );
        }

        const [newContract] = await prisma.$transaction(queries);

        RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
            data: {
                propertyId: contract.propertyId,
                status: PropertyStatus.ACTIVE,
            },
            type: CONTRACT_QUEUE.type.UPDATE_STATUS,
        });

        return newContract;
    } catch (error) {
        console.log('Error ending contract:', error);

        throw error;
    }
};

export const getContractByIdService = (params: { contractId: string; userId: string }) => {
    return getContractById(params);
};

export const endContractWhenOverdueService = async (contractId: string) => {
    try {
        const [contract, transaction] = await Promise.all([
            getContractById({ contractId }),
            findDepositedTransaction(contractId),
        ]);

        if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');
        if (!contract.renter.walletAddress) throw new CustomError(400, 'Người thuê chưa có địa chỉ ví');
        if (!transaction) throw new CustomError(404, 'Không tìm thấy giao dịch đặt cọc');

        const [{ receipt }, ethVnd] = await Promise.all([
            cancelSmartContractByRenterService({
                contractId,
                userAddress: contract.renter.walletAddress,
                notifyBefore30Days: false,
                depositAmountEth: transaction.amountEth || 0,
            }),
            getCoinPriceService(),
        ]);

        const feeEth = Number(await convertGasToEthService(Number(receipt.gasUsed)));
        const fee = feeEth * ethVnd;

        const [newContract] = await prisma.$transaction([
            updateStatusContract(contractId, 'CANCELLED'),
            updatePropertyStatus(contract.propertyId, 'ACTIVE'),
            createTransaction({
                amount: contract.depositAmount,
                contractId: contract.contractId,
                status: 'COMPLETED',
                title: `Bồi thường tiền huỷ hợp đồng`,
                description: `Bồi thường tiền huỷ hợp đồng **${contract.contractId}**`,
                toId: contract.ownerId,
                type: 'COMPENSATION',
                amountEth: transaction.amountEth || 0,
                transactionHash: receipt.transactionHash,
                fee,
                feeEth,
            }),
            createTransaction({
                title: 'Phí hủy hợp đồng',
                amount: fee,
                contractId: contractId,
                status: 'COMPLETED',
                type: 'CANCEL_CONTRACT',
                amountEth: feeEth,
                transactionHash: receipt.transactionHash,
                description: `Thanh toán phí hủy hợp đồng **${contractId}**`,
                fromId: contract.renterId,
            }),
            cancelTransactions([contractId]),
            cancelRequestWhenEndContract(contractId),
        ]);

        createNotificationQueue({
            title: 'Hợp đồng bị hủy',
            body: `Hợp đồng **${contract.contractId}** đã bị hủy do quá hạn thanh toán`,
            type: 'OWNER_CONTRACT',
            docId: contract.contractId,
            to: contract.ownerId,
        })
            .then(() => console.log('Notification sent to owner'))
            .catch((error) => console.error('Error sending notification:', error));

        createNotificationQueue({
            title: 'Hợp đồng bị hủy',
            body: `Hợp đồng **${contract.contractId}** đã bị hủy do quá hạn thanh toán`,
            type: 'RENTER_CONTRACT',
            docId: contract.contractId,
            to: contract.renterId,
        })
            .then(() => console.log('Notification sent to renter'))
            .catch((error) => console.error('Error sending notification:', error));

        RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
            data: {
                propertyId: contract.propertyId,
                status: PropertyStatus.ACTIVE,
            },
            type: CONTRACT_QUEUE.type.UPDATE_STATUS,
        });

        return newContract;
    } catch (error) {
        console.error('Error ending contract when overdue:', error);
        throw new Error('Could not end contract when overdue');
    }
};

export const startRentService = async (contractId: IContractId) => {
    const contract = await getContractById({ contractId });

    if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');

    await updatePropertyStatus(contract.propertyId, 'UNAVAILABLE');

    RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
        data: {
            propertyId: contract.propertyId,
            status: PropertyStatus.UNAVAILABLE,
        },
        type: CONTRACT_QUEUE.type.UPDATE_STATUS,
    });
};

export const finalizeContractService = async (contract: Contract) => {
    const [owner, transaction] = await Promise.all([
        findUserById(contract.ownerId),
        findDepositedTransaction(contract.contractId),
    ]);

    if (!owner) throw new CustomError(404, 'Không tìm thấy chủ nhà');
    if (!owner.walletAddress) throw new CustomError(400, 'Chủ nhà chưa có địa chỉ ví');
    if (!transaction) throw new CustomError(404, 'Không tìm thấy giao dịch đặt cọc');

    const receipt = await endSmartContractService({
        contractId: contract.contractId,
        userAddress: owner.walletAddress,
        depositAmountEth: transaction.amountEth || 0,
    });

    const ethVnd = await getCoinPriceService();
    const eth = Number(await convertGasToEthService(Number(receipt.gasUsed)));
    const fee = eth * ethVnd;

    await prisma.$transaction([
        cancelRequestWhenEndContract(contract.contractId),
        cancelExtensionRequestWhenEndContract(contract.contractId),
        updateStatusContract(contract.contractId, 'ENDED'),
        updatePropertyStatus(contract.propertyId, 'ACTIVE'),
        cancelTransactionsWhenEndContract(contract.contractId),
        createTransaction({
            title: 'Hoàn trả tiền đặt cọc',
            description: `Hoàn trả tiền đặt cọc cho hợp đồng **${contract.contractId}** vì hợp đồng đã kết thúc`,
            amount: contract.depositAmount,
            contractId: contract.contractId,
            status: 'COMPLETED',
            type: 'REFUND',
            toId: contract.renterId,
            amountEth: transaction.amountEth || 0,
            transactionHash: receipt.transactionHash,
        }),
        createTransaction({
            title: 'Phí kết thúc hợp đồng',
            description: `Thanh toán phí kết thúc hợp đồng **${contract.contractId}**`,
            amount: fee,
            contractId: contract.contractId,
            status: 'COMPLETED',
            type: 'END_CONTRACT',
            amountEth: eth,
            fromId: contract.ownerId,
            transactionHash: receipt.transactionHash,
        }),
    ]);

    RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
        data: {
            propertyId: contract.propertyId,
            status: PropertyStatus.ACTIVE,
        },
        type: CONTRACT_QUEUE.type.UPDATE_STATUS,
    });

    createNotificationQueue({
        title: 'Hợp đồng đã kết thúc',
        body: `Hợp đồng **${contract.contractId}** đã kết thúc`,
        type: 'OWNER_CONTRACT',
        docId: contract.contractId,
        to: contract.ownerId,
    }).catch((error) => console.error('Error sending notification:', error));

    createNotificationQueue({
        title: 'Hợp đồng đã kết thúc',
        body: `Hợp đồng **${contract.contractId}** đã kết thúc`,
        type: 'RENTER_CONTRACT',
        docId: contract.contractId,
        to: contract.renterId,
    }).catch((error) => console.error('Error sending notification:', error));
};

export const generateContractService = async ({ ownerId, propertyId, renterId, ...rest }: IGenerateContract) => {
    try {
        const [owner, ownerDetail, renter, renterDetail, property, contract] = await Promise.all([
            findUserById(ownerId),
            findUserDetailByUserIdService(ownerId),
            findUserById(renterId),
            findUserDetailByUserIdService(renterId),
            getPropertyByIdService(propertyId),
            getContractInRange({
                propertyId: propertyId,
                rentalEndDate: convertDateToDB(rest.rentalEndDate),
                rentalStartDate: convertDateToDB(rest.rentalStartDate),
            }),
        ]);

        if (!owner) throw new CustomError(404, 'Chủ nhà không tồn tại');
        if (!renter) throw new CustomError(404, 'Người thuê không tồn tại');
        if (!ownerDetail) throw new CustomError(404, 'Chủ nhà chưa xác thực thông tin');
        if (!renterDetail) throw new CustomError(404, 'Người thuê chưa xác thực thông tin');
        if (!property) throw new CustomError(404, 'Bất động sản không tồn tại');
        if (!owner.walletAddress) throw new CustomError(400, 'Chủ nhà chưa có địa chỉ ví');
        if (!renter.walletAddress) throw new CustomError(400, 'Người thuê chưa có địa chỉ ví');

        if (contract)
            throw new CustomError(
                400,
                `Bất động sản đã có hợp đồng trong thời gian ${convertDateToString(
                    new Date(contract.startDate),
                )} - ${convertDateToString(new Date(contract.endDateActual))}`,
            );

        const date = new Date();

        const rentalRequest: RentalRequest = {
            ...rest,
            createdAt: new Date(),
            ownerId,
            propertyId,
            renterId,
            requestId: 1,
            status: 'APPROVED',
            updatedAt: new Date(),
            rentalEndDate: new Date(rest.rentalEndDate),
            rentalStartDate: new Date(rest.rentalStartDate),
        };

        return {
            contractContent: createContract({
                city: property.address.city,
                date,
                owner,
                ownerDetail,
                renter,
                renterDetail,
                property,
                rentalRequest,
            }),
            ownerId,
            renterId,
            propertyId,
            startDate: rentalRequest.rentalStartDate,
            endDate: rentalRequest.rentalEndDate,
            monthlyRent: rentalRequest.rentalPrice,
            depositAmount: rentalRequest.rentalDeposit,
        };
    } catch (error) {
        console.log("Here's the error:", error);

        throw error;
    }
};
