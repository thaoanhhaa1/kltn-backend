import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { createContractReq } from '../schemas/contract.schema';
import {
    createContractService,
    depositService ,
    payMonthlyRentService,
    cancelContractByOwnerService,
    cancelContractByRenterService,
    // getAllContractsService,
    // getContractByIdService,
    // getContractsByOwnerIdService,
    // getContractsByRenterIdService,
    // softDeleteContractByIdService,
    // updateContractByIdService,
} from '../services/contract.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';

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

export const cancelContractByOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { contractId, ownerUserId, cancellationDate } = req.body;

        // Chuyển đổi cancellationDate từ chuỗi thành đối tượng Date
        const parsedCancellationDate = new Date(cancellationDate);

        // Kiểm tra dữ liệu đầu vào
        if (typeof contractId !== 'number' || typeof ownerUserId !== 'number' || isNaN(parsedCancellationDate.getTime())) {
            throw new Error('Contract ID, ownerUserId, and cancellationDate are required and must be valid.');
        }
        const updatedContract = await cancelContractByOwnerService(contractId, ownerUserId, parsedCancellationDate);
        res.status(200).json(updatedContract);
    } catch (error) {
        // Chuyển lỗi cho middleware xử lý lỗi
        next(error);
    }
};


export const cancelContractByRenter = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { contractId, renterUserId, cancellationDate } = req.body;

        const parsedCancellationDate = new Date(cancellationDate);


        // Kiểm tra dữ liệu đầu vào
        if (typeof contractId !== 'number' || typeof renterUserId !== 'number' || typeof isNaN(parsedCancellationDate.getTime())) {
            throw new Error('Contract ID, renter ID, and notifyBefore30Days are required and must be valid.');
        }
        const updatedContract = await cancelContractByRenterService(contractId, renterUserId, cancellationDate);
        res.status(200).json(updatedContract);
    } catch (error) {
        // Chuyển lỗi cho middleware xử lý lỗi
        next(error);
    }
};

