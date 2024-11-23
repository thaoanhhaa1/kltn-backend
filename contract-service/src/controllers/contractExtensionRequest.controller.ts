import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
    createContractExtensionRequestSchema,
    updateContractExtensionRequestStatusSchema,
} from '../schemas/contractExtensionRequest.schema';
import {
    createContractExtensionRequestService,
    getContractExtensionRequestByContractIdService,
    updateContractExtensionRequestStatusService,
} from '../services/contractExtensionRequest.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';

export const createContractExtensionRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const safeParse = createContractExtensionRequestSchema.safeParse({
            ...req.body,
            userId,
        });

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.errors,
                message: 'Dữ liệu không hợp lệ',
                status: 400,
            });

        const result = await createContractExtensionRequestService(safeParse.data);

        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

export const updateContractExtensionRequestStatus = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user!.id;

        const safeParse = updateContractExtensionRequestStatusSchema.safeParse({
            ...req.body,
            userId,
        });

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.errors,
                message: 'Dữ liệu không hợp lệ',
                status: 400,
            });

        const result = await updateContractExtensionRequestStatusService(safeParse.data);
        console.log('🚀 ~ result:', result);

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const getContractExtensionRequestByContractId = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { contractId } = req.params;

        const result = await getContractExtensionRequestByContractIdService(contractId);

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
