// contract.service.ts

import { CreateContractReq } from '../schemas/contract.schema';
import { Contract as PrismaContract } from '@prisma/client';
import {
    createContract as createContractInRepo,
    depositAndCreateContract as depositAndCreateContractInRepo,
    payMonthlyRent as payMonthlyRentInRepo,
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


export const depositAndCreateContractService = async (contractId: number, renterAddress: string): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để thực hiện đặt cọc và tạo hợp đồng
        return await depositAndCreateContractInRepo(contractId, renterAddress);
    } catch (error) {
        console.error("Error processing deposit and creating contract:", error);
        throw new Error("Could not process deposit and create contract");
    }
};

// Hàm để thanh toán tiền thuê hàng tháng
export const payMonthlyRentService = async (contractId: number, renterAddress: string): Promise<PrismaContract> => {
    try {
        // Gọi phương thức repository để thực hiện thanh toán tiền thuê
        return await payMonthlyRentInRepo(contractId, renterAddress);
    } catch (error) {
        console.error("Error processing monthly rent payment:", error);
        throw new Error("Could not process monthly rent payment");
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
