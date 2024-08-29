import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { createContractReq } from '../schemas/contract.schema';
import {
    createContractService,
    depositService ,
    payMonthlyRentService,
    // getAllContractsService,
    // getContractByIdService,
    // getContractsByOwnerIdService,
    // getContractsByRenterIdService,
    // softDeleteContractByIdService,
    // updateContractByIdService,
} from '../services/contract.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';
import CustomError from '../utils/error.util';

export const createContract = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const safeParse = createContractReq.safeParse(req.body);

        if (!safeParse.success) throw convertZodIssueToEntryErrors({ issue: safeParse.error.issues });

        const contractData = safeParse.data;

        // Gọi hàm service để tạo hợp đồng
        const createdContract = await createContractService(contractData);

        // Phản hồi với dữ liệu hợp đồng đã tạo
        res.status(201).json(createdContract);
    } catch (error) {
        next(error);
    }
};

export const deposit = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { contractId, renterUserId } = req.body;

        // Kiểm tra dữ liệu đầu vào
         if (isNaN(Number(contractId)) || isNaN(Number(renterUserId))) {
            return res.status(400).json({ message: 'Contract ID and renter ID are required and must be valid numbers.' });
        }

        // Gọi hàm service để thực hiện đặt cọc và tạo hợp đồng
        const result = await depositService(contractId, renterUserId);

        // Trả về kết quả thành công
        res.status(200).json(result);
    } catch (error) {
        // Chuyển lỗi cho middleware xử lý lỗi
        next(error);
    }
};

export const payMonthlyRent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { contractId, renterUserId } = req.body;

        // Kiểm tra dữ liệu đầu vào
          if (isNaN(Number(contractId)) || isNaN(Number(renterUserId))) {
            return res.status(400).json({ message: 'Contract ID and renter ID are required and must be valid numbers.' });
        }

        // Gọi hàm service để thực hiện thanh toán tiền thuê
        const updatedContract = await payMonthlyRentService(contractId, renterUserId);

        // Phản hồi với dữ liệu hợp đồng đã cập nhật
        res.status(200).json(updatedContract);
    } catch (error) {
        // Chuyển lỗi cho middleware xử lý lỗi
        next(error);
    }
};
// export const createContract = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     try {
//         const safeParse = createContractReq.safeParse(req.body);

//         if (!safeParse.success) throw convertZodIssueToEntryErrors({ issue: safeParse.error.issues });

//         const contract = await createContractService(safeParse.data);

//         res.status(201).json(contract);
//     } catch (error) {
//         next(error);
//     }
// };

// export const getAllContracts = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     try {
//         const contracts = await getAllContractsService();

//         res.json(contracts);
//     } catch (error) {
//         next(error);
//     }
// };

// export const getContractById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     try {
//         const contractId = parseInt(req.params.contractId, 10);

//         const contract = await getContractByIdService({
//             contractId,
//             userId: req.user!.id,
//         });

//         if (!contract) throw new CustomError(404, 'Contract not found');

//         res.json(contract);
//     } catch (error) {
//         next(error);
//     }
// };

// export const getContractsByOwnerId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     try {
//         const userId = req.user!.id;

//         const contracts = await getContractsByOwnerIdService(userId);

//         res.json(contracts);
//     } catch (error) {
//         next(error);
//     }
// };

// export const getContractsByRenterId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     try {
//         const userId = req.user!.id;

//         const contracts = await getContractsByRenterIdService(userId);

//         res.json(contracts);
//     } catch (error) {
//         next(error);
//     }
// };

// export const updateContractById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     try {
//         const contractId = parseInt(req.params.contractId, 10);

//         const safeParse = createContractReq.safeParse(req.body);

//         if (!safeParse.success) throw convertZodIssueToEntryErrors({ issue: safeParse.error.issues });

//         const contract = await updateContractByIdService(contractId, safeParse.data);

//         if (!contract) throw new CustomError(404, 'Contract not found');

//         res.json(contract);
//     } catch (error) {
//         next(error);
//     }
// };

// export const deleteContractById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     try {
//         const contractId = parseInt(req.params.contractId, 10);

//         const contract = await softDeleteContractByIdService(contractId);

//         if (!contract) throw new CustomError(404, 'Contract not found');

//         res.json(contract);
//     } catch (error) {
//         next(error);
//     }
// };
