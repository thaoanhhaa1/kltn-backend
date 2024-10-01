import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { createContractCancellationRequestSchema } from '../schemas/contractCancellationRequest.schema';
import {
    createCancellationRequestService,
    updateStatusRequestService,
} from '../services/contractCancellationRequest.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';
import CustomError from '../utils/error.util';

export const createCancellationRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const safeParser = createContractCancellationRequestSchema.safeParse({
            ...req.body,
            requestedBy: userId,
        });

        if (!safeParser.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParser.error.issues,
                message: 'Dữ liệu không hợp lệ',
                status: 400,
            });

        const result = await createCancellationRequestService(safeParser.data);

        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

export const updateCancellationRequestStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const requestId = Number(req.params.requestId);
        const { status } = req.body;

        if (!Number.isInteger(requestId)) throw new CustomError(400, 'Mã yêu cầu không hợp lệ');
        if (!status) throw new CustomError(400, 'Trạng thái không được để trống');

        return res.json(await updateStatusRequestService({ requestId, userId, status }));
    } catch (error) {
        next(error);
    }
};
