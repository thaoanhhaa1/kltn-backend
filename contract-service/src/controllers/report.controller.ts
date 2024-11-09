import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
    acceptReportByOwnerSchema,
    createReportForRenterSchema,
    proposedReportChildByOwnerSchema,
    resolveReportByAdminSchema,
} from '../schemas/report.schema';
import {
    acceptReportByOwnerService,
    acceptReportByRenterService,
    cancelReportChildService,
    completeReportByOwnerService,
    completeReportByRenterService,
    createReportForRenterService,
    proposedReportChildByOwnerService,
    rejectReportByRenterService,
    resolveReportByAdminService,
} from '../services/report.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';
import { uploadFiles } from '../utils/uploadToFirebase.util';

export const createReportForRenter = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const files = req.files as Express.Multer.File[] | undefined;

        const imageUrls: Array<string> = [];

        if (files) imageUrls.push(...files.map((file) => file.originalname));

        const safePare = createReportForRenterSchema.safeParse({
            ...req.body,
            evidences: imageUrls,
            renterId: userId,
        });

        if (!safePare.success)
            throw convertZodIssueToEntryErrors({
                issue: safePare.error.issues,
            });

        if (files) {
            const images = await uploadFiles({ files, folder: 'reports' });

            imageUrls.length = 0;

            imageUrls.push(...images);
        }

        const result = await createReportForRenterService({
            ...safePare.data,
            evidences: imageUrls,
        });

        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

export const acceptReportByOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const safeParse = acceptReportByOwnerSchema.safeParse({
            ...req.body,
            userId,
        });

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
            });

        const result = await acceptReportByOwnerService(safeParse.data);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const cancelReportChild = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const reportChildId = Number(req.params.id);

        const result = await cancelReportChildService({ reportChildId, userId });

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const proposedReportChildByOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const safeParse = proposedReportChildByOwnerSchema.safeParse({
            ...req.body,
            ownerId: userId,
        });

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
            });

        const result = await proposedReportChildByOwnerService(safeParse.data);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const acceptReportByRenter = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const reportChildId = Number(req.body.reportChildId);

        const result = await acceptReportByRenterService(reportChildId, userId);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const rejectReportByRenter = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const reportChildId = Number(req.body.reportChildId);

        const result = await rejectReportByRenterService(reportChildId, userId);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const resolveReportByAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const safeParse = resolveReportByAdminSchema.safeParse(req.body);

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
            });

        const result = await resolveReportByAdminService(safeParse.data);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const completeReportByOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const reportChildId = Number(req.body.reportChildId);

        const result = await completeReportByOwnerService(reportChildId, userId);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const completeReportByRenter = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const reportChildId = Number(req.body.reportChildId);

        const result = await completeReportByRenterService(reportChildId, userId);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
