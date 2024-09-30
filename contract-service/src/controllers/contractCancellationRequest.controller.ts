import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { createContractCancellationRequestSchema } from '../schemas/contractCancellationRequest.schema';
import { createCancellationRequestService } from '../services/contractCancellationRequest.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';

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
