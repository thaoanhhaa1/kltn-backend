// contract.service.ts

import { Contract as PrismaContract } from '@prisma/client';
import { v4 } from 'uuid';
import { IUserId } from '../interfaces/user';
import {
    cancelContractByOwner as cancelContractByOwnerInRepo,
    cancelContractByRenter as cancelContractByRenterInRepo,
    createContract as createContractInRepo,
    deposit as depositInRepo,
    endContract as endContractInRepo,
    getContractDetails as getContractDetailsInRepo,
    getContractsByOwner,
    getContractsByRenter,
    getContractTransactions as getContractTransactionsInRepo,
    payMonthlyRent as payMonthlyRentInRepo,
    terminateForNonPayment as terminateForNonPaymentInRepo,
} from '../repositories/contract.repository';
import { findUserById } from '../repositories/user.repository';
import { CreateContractReq } from '../schemas/contract.schema';
import CustomError from '../utils/error.util';
import { createSmartContractService } from './blockchain.service';
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

export const depositService = async (contractId: string, renterUserId: IUserId): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để thực hiện đặt cọc và tạo hợp đồng
        return await depositInRepo(contractId, renterUserId);
    } catch (error) {
        console.error('Error processing deposit and creating contract:', error);
        throw new Error('Could not process deposit and create contract');
    }
};

// Hàm để thanh toán tiền thuê hàng tháng
export const payMonthlyRentService = async (contractId: string, renterUserId: IUserId): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để thực hiện thanh toán tiền thuê
        return await payMonthlyRentInRepo(contractId, renterUserId);
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
