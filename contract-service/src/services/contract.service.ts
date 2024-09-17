// contract.service.ts

import { CreateContractReq } from '../schemas/contract.schema';
import { Contract as PrismaContract } from '@prisma/client';
import {
    createContract as createContractInRepo,
    deposit as depositInRepo,
    payMonthlyRent as payMonthlyRentInRepo,
    cancelContractByRenter as cancelContractByRenterInRepo,
    cancelContractByOwner as cancelContractByOwnerInRepo,
    getContractTransactions as getContractTransactionsInRepo,
    getContractDetails as getContractDetailsInRepo,
    endContract as endContractInRepo,
    terminateForNonPayment as terminateForNonPaymentInRepo,
    // getContractById as getContractByIdInRepo,
    // updateContractStatus as updateContractStatusInRepo,
    // deleteContract as deleteContractInRepo
} from '../repositories/contract.repository';
import { IUserId } from '../interfaces/user';

// Hàm để tạo hợp đồng
export const createContractService = async (contract: CreateContractReq): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để tạo hợp đồng
        return await createContractInRepo(contract);
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
        console.error("Error ending contract:", error);
        throw new Error("Could not end contract");
    }
};


// Hàm để hủy hợp đồng do không thanh toán
export const terminateForNonPaymentService = async (contractId: string, ownerUserId: string): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để thực hiện hủy hợp đồng do không thanh toán
        return await terminateForNonPaymentInRepo(contractId, ownerUserId);
    } catch (error) {
        console.error("Error terminating contract for non-payment:", error);
        throw new Error("Could not terminate contract for non-payment");
    }
};


