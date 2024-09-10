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
    terminateForNonPayment as terminateForNonPaymentInRepo
    // getContractById as getContractByIdInRepo,
    // updateContractStatus as updateContractStatusInRepo,
    // deleteContract as deleteContractInRepo
} from '../repositories/contract.repository';

// Hàm để tạo hợp đồng
export const createContractService = async (contract: CreateContractReq): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để tạo hợp đồng
        return await createContractInRepo(contract);
    } catch (error) {
        console.error("Error creating contract:", error);
        throw new Error("Could not create contract");
    }
};


export const depositService = async (contractId: number, renterUserId: number): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để thực hiện đặt cọc và tạo hợp đồng
        return await depositInRepo(contractId, renterUserId);
    } catch (error) {
        console.error("Error processing deposit and creating contract:", error);
        throw new Error("Could not process deposit and create contract");
    }
};

// Hàm để thanh toán tiền thuê hàng tháng
export const payMonthlyRentService = async (contractId: number, renterUserId: number): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để thực hiện thanh toán tiền thuê
        return await payMonthlyRentInRepo(contractId, renterUserId);
    } catch (error) {
        console.error("Error processing monthly rent payment:", error);
        throw new Error("Could not process monthly rent payment");
    }
};

// Hàm để hủy hợp đồng bởi người thuê
export const cancelContractByRenterService = async (contractId: number, renterUserId: number, cancellationDate: Date): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để thực hiện hủy hợp đồng
        return await cancelContractByRenterInRepo(contractId, renterUserId, cancellationDate);
    } catch (error) {
        console.error("Error processing contract cancellation:", error);
        throw new Error("Could not process contract cancellation");
    }
};

// Hàm để hủy hợp đồng bởi chủ nhà
export const cancelContractByOwnerService = async (contractId: number, ownerUserId: number, cancellationDate: Date): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để thực hiện hủy hợp đồng
        return await cancelContractByOwnerInRepo(contractId, ownerUserId, cancellationDate);
    } catch (error) {
        console.error("Error processing contract cancellation:", error);
        throw new Error("Could not process contract cancellation");
    }
};

// Hàm để kết thúc hợp đồng
export const endContractService = async (contractId: number, userId: number): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để thực hiện hủy hợp đồng
        return await endContractInRepo(contractId, userId);
    } catch (error) {
        console.error("Error ending contract:", error);
        throw new Error("Could not end contract");
    }
};


// Hàm để lấy danh sách giao dịch của hợp đồng từ blockchain
export const getContractTransactionsService = async (contractId: number, userId: number): Promise<any[]> => {
    try {
        // Gọi phương thức repository để lấy danh sách giao dịch
        return await getContractTransactionsInRepo(contractId, userId);
    } catch (error) {
        console.error("Error fetching contract transactions:", error);
        throw new Error("Could not fetch contract transactions");
    }
};

// Hàm để lấy chi tiết hợp đồng
export const getContractDetailsService = async (contractId: number, userId: number): Promise<any> => {
    try {
        // Gọi phương thức repository để lấy chi tiết hợp đồng
        return await getContractDetailsInRepo(contractId, userId);
    } catch (error) {
        console.error("Error fetching contract details:", error);
        throw new Error("Could not fetch contract details");
    }
};

// Hàm để hủy hợp đồng do không thanh toán
export const terminateForNonPaymentService = async (contractId: number, ownerUserId: number): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để thực hiện hủy hợp đồng do không thanh toán
        return await terminateForNonPaymentInRepo(contractId, ownerUserId);
    } catch (error) {
        console.error("Error terminating contract for non-payment:", error);
        throw new Error("Could not terminate contract for non-payment");
    }
};

// // Hàm để lấy hợp đồng theo ID
// export const getContractById = async (contractId: number): Promise<PrismaContract | null> => {
//     try {
//         // Gọi phương thức repository để lấy hợp đồng
//         return await getContractByIdInRepo(contractId);
//     } catch (error) {
//         console.error("Error fetching contract:", error);
//         throw new Error("Could not fetch contract");
//     }
// };

// // Hàm để cập nhật trạng thái hợp đồng
// export const updateContractStatus = async (contractId: number, status: 'WAITING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'): Promise<PrismaContract> => {
//     try {
//         // Gọi phương thức repository để cập nhật trạng thái
//         return await updateContractStatusInRepo(contractId, status);
//     } catch (error) {
//         console.error("Error updating contract status:", error);
//         throw new Error("Could not update contract status");
//     }
// };

// // Hàm để xóa hợp đồng (đánh dấu là đã xóa)
// export const deleteContract = async (contractId: number): Promise<PrismaContract> => {
//     try {
//         // Gọi phương thức repository để xóa hợp đồng
//         return await deleteContractInRepo(contractId);
//     } catch (error) {
//         console.error("Error deleting contract:", error);
//         throw new Error("Could not delete contract");
//     }
// };
