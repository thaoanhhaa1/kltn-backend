import { NextFunction, Response } from 'express';
import { ICreateNotification } from '../interfaces/notification';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { createContractReq } from '../schemas/contract.schema';
import {
    cancelContractBeforeDepositService,
    createContractAndApprovalRequestService,
    createContractService,
    depositService,
    getContractByIdService,
    getContractDetailService,
    getContractsByOwnerService,
    getContractsByRenterService,
    getContractTransactionsService,
    payMonthlyRentService,
    terminateForNonPaymentService,
} from '../services/contract.service';
import { createNotificationQueue } from '../services/rabbitmq.service';
import { findUserByIdService } from '../services/user.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';
import CustomError from '../utils/error.util';

export const createContractAndApprovalRequest = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const safeParse = createContractReq.safeParse(req.body);

        if (!safeParse.success) throw convertZodIssueToEntryErrors({ issue: safeParse.error.issues });

        const contractData = safeParse.data;

        const { requestId } = req.body;

        const result = await createContractAndApprovalRequestService(contractData, {
            ownerId: req.user!.id,
            requestId,
            status: 'APPROVED',
        });

        findUserByIdService(req.user!.id)
            .then((owner) =>
                createNotificationQueue({
                    body: `**${owner?.name}** đã tạo hợp đồng cho bạn với mã hợp đồng **${result.contractId}** dựa trên yêu cầu thuê nhà của bạn`,
                    title: 'Hợp đồng thuê nhà',
                    type: 'RENTER_CONTRACT',
                    docId: result.contractId,
                    from: owner?.userId,
                    to: result.renterId,
                }),
            )
            .then(() => console.log('Notification sent'))
            .catch((error) => console.log('Error sending notification', error));

        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

export const createContract = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const safeParse = createContractReq.safeParse(req.body);

        if (!safeParse.success) throw convertZodIssueToEntryErrors({ issue: safeParse.error.issues });

        const contractData = safeParse.data;

        // Gọi hàm service để tạo hợp đồng
        const createdContract = await createContractService({
            ...contractData,
            ownerId: userId,
        });

        Promise.all([findUserByIdService(userId), findUserByIdService(contractData.renterId)])
            .then(([owner, renter]) => {
                const notification: ICreateNotification = {
                    body: `**${owner?.name}** đã tạo hợp đồng cho bạn với mã hợp đồng ${createdContract.contractId}`,
                    title: 'Hợp đồng thuê nhà',
                    type: 'RENTER_CONTRACT',
                    from: owner?.userId,
                    to: renter?.userId,
                    docId: createdContract.contractId,
                };

                return createNotificationQueue(notification);
            })
            .then(() => console.log('Notification sent'))
            .catch((error) => console.log('Error sending notification', error));

        // Phản hồi với dữ liệu hợp đồng đã tạo
        res.status(201).json(createdContract);
    } catch (error) {
        next(error);
    }
};

export const deposit = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { transactionId, contractId } = req.body;

        if (!transactionId) throw new CustomError(400, 'Mã giao dịch không được để trống');
        if (!contractId) throw new CustomError(400, 'Mã hợp đồng không được để trống');

        const result = await depositService({
            contractId,
            renterId: userId,
            transactionId,
        });

        findUserByIdService(userId)
            .then((renter) =>
                createNotificationQueue({
                    body: `**${renter?.name}** đã thực hiện thanh toán cọc cho hợp đồng **${contractId}**`,
                    title: 'Thanh toán cọc',
                    type: 'OWNER_CONTRACT',
                    from: userId,
                    to: result.ownerId,
                    docId: contractId,
                }),
            )
            .then(() => console.log('Notification sent'))
            .catch((error) => console.log('Error sending notification', error));

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const payMonthlyRent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { contractId, transactionId } = req.body;

        if (!contractId) throw new CustomError(400, 'Mã hợp đồng không được để trống');
        if (!transactionId) throw new CustomError(400, 'Mã giao dịch không được để trống');

        const userId = req.user!.id;

        const updatedContract = await payMonthlyRentService({
            contractId,
            renterId: userId,
            transactionId,
        });

        findUserByIdService(userId)
            .then((renter) =>
                createNotificationQueue({
                    body: `**${renter?.name}** đã thực hiện thanh toán tiền thuê cho hợp đồng **${contractId}**`,
                    title: 'Thanh toán tiền thuê',
                    type: 'OWNER_CONTRACT',
                    from: userId,
                    to: updatedContract.toId!,
                    docId: contractId,
                }),
            )
            .then(() => console.log('Notification sent'))
            .catch((error) => console.log('Error sending notification', error));

        res.status(200).json(updatedContract);
    } catch (error) {
        next(error);
    }
};

// Hàm để lấy danh sách giao dịch của hợp đồng từ blockchain
export const getContractTransactions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { contractId } = req.params;
        const { userId } = req.query;

        // Kiểm tra dữ liệu đầu vào
        if (typeof userId !== 'string') {
            return res.status(400).json({ message: 'Contract ID is required and must be a valid string.' });
        }

        if (typeof userId !== 'string') {
            return res.status(400).json({ message: 'User ID is required and must be a valid string.' });
        }

        // Gọi hàm service để lấy danh sách giao dịch
        const transactions = await getContractTransactionsService(contractId, userId);

        // Trả về danh sách giao dịch
        res.status(200).json(transactions);
    } catch (error) {
        // Chuyển lỗi cho middleware xử lý lỗi
        next(error);
    }
};

// Hàm để lấy chi tiết hợp đồng
export const getContractDetail = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { contractId } = req.params;
        const userId = req.user!.id;

        if (!contractId) return res.status(400).json({ message: 'Mã hợp đồng không được để trống' });

        // Gọi hàm service để lấy chi tiết hợp đồng
        const contractDetail = await getContractDetailService({
            contractId,
            userId,
        });

        if (!contractDetail) return res.status(404).json({ message: 'Không tìm thấy hợp đồng' });

        // Trả về chi tiết hợp đồng
        res.status(200).json(contractDetail);
    } catch (error) {
        // Chuyển lỗi cho middleware xử lý lỗi
        next(error);
    }
};

export const terminateForNonPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { contractId, ownerUserId } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (typeof contractId !== 'string' || typeof ownerUserId !== 'string') {
            return res.status(400).json({ message: 'Contract ID and owner ID must be a valid string.' });
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

export const getContractsByOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const take = Number(req.query.take) || 10;
        const skip = Number(req.query.skip) || 0;

        const contracts = await getContractsByOwnerService(userId, {
            skip,
            take,
        });

        res.status(200).json(contracts);
    } catch (error) {
        next(error);
    }
};

export const getContractsByRenter = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const take = Number(req.query.take) || 10;
        const skip = Number(req.query.skip) || 0;

        const contracts = await getContractsByRenterService(userId, {
            skip,
            take,
        });

        res.status(200).json(contracts);
    } catch (error) {
        next(error);
    }
};

export const cancelContractBeforeDeposit = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { contractId } = req.body;
        const userId = req.user!.id;

        const updatedContract = await cancelContractBeforeDepositService({ contractId, userId });

        getContractByIdService({
            contractId,
            userId,
        })
            .then((contract) => {
                if (!contract) throw new CustomError(404, 'Contract not found');

                return contract;
            })
            .then((contract) =>
                createNotificationQueue({
                    body: `Hợp đồng **${contractId}** đã bị hủy trước khi thanh toán cọc bởi **${
                        userId === contract?.ownerId ? contract.owner.name : contract?.renter.name
                    }**`,
                    title: 'Hủy hợp đồng',
                    type: userId === contract?.ownerId ? 'RENTER_CONTRACT' : 'OWNER_CONTRACT',
                    from: userId,
                    to: userId === contract?.ownerId ? contract.renterId : contract.ownerId,
                    docId: contractId,
                }),
            )
            .then(() => console.log('Notification sent'))
            .catch((error) => console.log('Error sending notification', error));

        res.status(200).json(updatedContract);
    } catch (error) {
        next(error);
    }
};
