// contract.service.ts

import { Contract as PrismaContract, PropertyStatus } from '@prisma/client';
import { isAfter } from 'date-fns';
import { v4 } from 'uuid';
import RabbitMQ from '../configs/rabbitmq.config';
import { CONTRACT_QUEUE } from '../constants/rabbitmq';
import { IDeposit } from '../interfaces/contract';
import { IUserId } from '../interfaces/user';
import prisma from '../prisma/prismaClient';
import {
    cancelContractByOwner as cancelContractByOwnerInRepo,
    cancelContractByRenter as cancelContractByRenterInRepo,
    createContract as createContractInRepo,
    deposit as depositInRepo,
    endContract as endContractInRepo,
    findContractById,
    getContractDetails as getContractDetailsInRepo,
    getContractsByOwner,
    getContractsByRenter,
    getContractTransactions as getContractTransactionsInRepo,
    payMonthlyRent as payMonthlyRentInRepo,
    terminateForNonPayment as terminateForNonPaymentInRepo,
} from '../repositories/contract.repository';
import { updatePropertyStatus } from '../repositories/property.repository';
import { createTransaction, getTransactionById, paymentTransaction } from '../repositories/transaction.repository';
import { findUserById } from '../repositories/user.repository';
import { CreateContractReq } from '../schemas/contract.schema';
import CustomError from '../utils/error.util';
import {
    createSmartContractService,
    depositSmartContractService,
    payMonthlyRentSmartContractService,
} from './blockchain.service';
import { getCoinPriceService } from './coingecko.service';
import { createTransactionService } from './transaction.service';

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

        const receipt = await createSmartContractService({
            ...contract,
            contract_id: contractId,
            owner_wallet_address: owner.wallet_address,
            renter_wallet_address: renter.wallet_address,
        });

        const result = await createContractInRepo({
            ...contract,
            owner_wallet_address: owner.wallet_address,
            renter_wallet_address: renter.wallet_address,
            contract_id: contractId,
            transaction_hash: receipt.transactionHash,
        });

        createTransactionService({
            from_id: renter.user_id,
            amount: contract.deposit_amount,
            contract_id: contractId,
            title: 'Thanh toán tiền đặt cọc',
            description: `Thanh toán tiền đặt cọc cho hợp đồng **${contractId}**`,
            status: 'PENDING',
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

        const [receipt, ethVnd] = await Promise.all([
            depositSmartContractService({
                contractId,
                renterAddress: renter.wallet_address,
            }),
            getCoinPriceService({
                coin: 'ethereum',
                currency: 'vnd',
            }),
        ]);

        const [, , transactionResult] = await prisma.$transaction([
            paymentTransaction({
                amount_eth: transaction.amount / ethVnd,
                fee: Number(receipt.gasUsed) / 1e18,
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

        if (isAfter(new Date(), contract.start_date)) {
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
            })
                .then(() => console.log('Transaction created'))
                .catch((error) => console.error('Error creating transaction:', error));
        }

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

            getCoinPriceService({
                coin: 'ethereum',
                currency: 'vnd',
            }),
        ]);

        const [transactionResult] = await prisma.$transaction([
            paymentTransaction({
                amount_eth: transaction.amount / ethVnd,
                fee: Number(receipt.gasUsed) / 1e18,
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

// Hàm để hủy hợp đồng bởi người thuê
export const cancelContractByRenterService = async (
    contractId: string,
    renterUserId: IUserId,
    cancellationDate: Date,
): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để thực hiện hủy hợp đồng
        return await cancelContractByRenterInRepo(contractId, renterUserId, cancellationDate);
    } catch (error) {
        console.error('Error processing contract cancellation:', error);
        throw new Error('Could not process contract cancellation');
    }
};

// Hàm để hủy hợp đồng bởi chủ nhà
export const cancelContractByOwnerService = async (
    contractId: string,
    ownerUserId: IUserId,
    cancellationDate: Date,
): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để thực hiện hủy hợp đồng
        return await cancelContractByOwnerInRepo(contractId, ownerUserId, cancellationDate);
    } catch (error) {
        console.error('Error processing contract cancellation:', error);
        throw new Error('Could not process contract cancellation');
    }
};

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

// Hàm để kết thúc hợp đồng
export const endContractService = async (contractId: string, userId: string): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để thực hiện hủy hợp đồng
        return await endContractInRepo(contractId, userId);
    } catch (error) {
        console.error('Error ending contract:', error);
        throw new Error('Could not end contract');
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
