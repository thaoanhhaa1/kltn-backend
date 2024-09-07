import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { createContractReq } from '../schemas/contract.schema';
import {
    createContractService,
    depositService ,
    payMonthlyRentService,
    cancelContractByOwnerService,
    cancelContractByRenterService,
    getContractTransactionsService,
    getContractDetailsService,
    endContractService,
    terminateForNonPaymentService,
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

        // Chuyển đổi cancellationDate từ chuỗi thành đối tượng Date
        const parsedCancellationDate = new Date(cancellationDate);

        // Kiểm tra dữ liệu đầu vào
        if (typeof contractId !== 'number' || typeof renterUserId !== 'number' || isNaN(parsedCancellationDate.getTime())) {
            throw new Error('Contract ID, renterUserId, and cancellationDate are required and must be valid.');
        }

        const updatedContract = await cancelContractByRenterService(contractId, renterUserId, parsedCancellationDate);
        res.status(200).json(updatedContract);
    } catch (error) {
        // Chuyển lỗi cho middleware xử lý lỗi
        next(error);
    }
};

export const endContract = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { contractId, userId } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (isNaN(Number(contractId)) || isNaN(Number(userId))) {
            return res.status(400).json({ message: 'Contract ID and user ID are required and must be valid numbers.' });
        }

        // Gọi hàm service để kết thúc hợp đồng
        const result = await endContractService(Number(contractId), Number(userId));

        // Trả về kết quả thành công
        res.status(200).json(result);
    } catch (error) {
        // Chuyển lỗi cho middleware xử lý lỗi
        next(error);
    }
};


// Hàm để lấy danh sách giao dịch của hợp đồng từ blockchain
export const getContractTransactions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { contractId } = req.params;
        const { userId } = req.query;

        // Kiểm tra dữ liệu đầu vào
        if (isNaN(Number(contractId))) {
            return res.status(400).json({ message: 'Contract ID is required and must be a valid number.' });
        }

        if (isNaN(Number(userId))) {
            return res.status(400).json({ message: 'User ID is required and must be a valid number.' });
        }

        // Gọi hàm service để lấy danh sách giao dịch
        const transactions = await getContractTransactionsService(Number(contractId), Number(userId));

        // Trả về danh sách giao dịch
        res.status(200).json(transactions);
    } catch (error) {
        // Chuyển lỗi cho middleware xử lý lỗi
        next(error);
    }
};

// Hàm để lấy chi tiết hợp đồng
export const getContractDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { contractId } = req.params;
        const { userId } = req.query;

        // Kiểm tra dữ liệu đầu vào
        if (isNaN(Number(contractId))) {
            return res.status(400).json({ message: 'Contract ID is required and must be a valid number.' });
        }

        if (isNaN(Number(userId))) {
            return res.status(400).json({ message: 'User ID is required and must be a valid number.' });
        }

        // Gọi hàm service để lấy chi tiết hợp đồng
        const contractDetails = await getContractDetailsService(Number(contractId), Number(userId));

        // Trả về chi tiết hợp đồng
        res.status(200).json(contractDetails);
    } catch (error) {
        // Chuyển lỗi cho middleware xử lý lỗi
        next(error);
    }
};

export const terminateForNonPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { contractId, ownerUserId } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (isNaN(Number(contractId)) || isNaN(Number(ownerUserId))) {
            return res.status(400).json({ message: 'Contract ID and owner ID are required and must be valid numbers.' });
        }

        // Gọi hàm service để hủy hợp đồng do không thanh toán
        const updatedContract = await terminateForNonPaymentService(contractId, ownerUserId);

        // Phản hồi với dữ liệu hợp đồng đã cập nhật
        res.status(200).json(updatedContract);
    } catch (error) {
        // Chuyển lỗi cho middleware xử lý lỗi
        next(error);
    }
};