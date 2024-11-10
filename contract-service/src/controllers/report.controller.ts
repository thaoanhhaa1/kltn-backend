import { ReportType } from '@prisma/client';
import { NextFunction, Response } from 'express';
import { ReportFilterStatus, ReportSort } from '../interfaces/report';
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
    findReportsAndLastChildService,
    getReportByAdminService,
    getReportByOwnerService,
    getReportByRenterService,
    getReportDetailByIdService,
    inProgressReportService,
    ownerNoResolveReportService,
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
        const reportId = Number(req.params.id);

        const result = await cancelReportChildService({ reportId, userId });

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const proposedReportChildByOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const files = req.files as Express.Multer.File[] | undefined;

        const imageUrls: Array<string> = [];

        if (files) imageUrls.push(...files.map((file) => file.originalname));

        const safeParse = proposedReportChildByOwnerSchema.safeParse({
            ...req.body,
            ownerId: userId,
            evidences: imageUrls,
        });

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
            });

        if (files) {
            const images = await uploadFiles({ files, folder: 'reports' });

            imageUrls.length = 0;

            imageUrls.push(...images);
        }

        const result = await proposedReportChildByOwnerService({
            ...safeParse.data,
            evidences: imageUrls,
        });

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
        const files = req.files as Express.Multer.File[] | undefined;

        const imageUrls: Array<string> = [];

        if (files) imageUrls.push(...files.map((file) => file.originalname));

        const safeParse = resolveReportByAdminSchema.safeParse({
            ...req.body,
            evidences: imageUrls,
        });

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
            });

        if (files) {
            const images = await uploadFiles({ files, folder: 'reports' });

            imageUrls.length = 0;

            imageUrls.push(...images);
        }

        const result = await resolveReportByAdminService({
            ...safeParse.data,
            evidences: imageUrls,
        });

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const completeReportByOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const reportId = Number(req.body.reportId);

        const result = await completeReportByOwnerService(reportId, userId);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const completeReportByRenter = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const reportId = Number(req.body.reportId);

        const result = await completeReportByRenterService(reportId, userId);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const findReportsAndLastChild = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const contractId = req.params.contractId;

        const result = await findReportsAndLastChildService(contractId, req.user!);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const getReportDetailById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const reportId = Number(req.params.id);
        const isAdmin = req.user!.userTypes.includes('admin');
        const userId = req.user!.id;

        const result = await getReportDetailByIdService({
            id: reportId,
            isAdmin,
            userId,
        });

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const inProgressReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const reportId = Number(req.body.reportId);

        const result = await inProgressReportService(reportId, userId);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const ownerNoResolveReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const reportId = Number(req.body.reportId);

        const result = await ownerNoResolveReportService(reportId, userId);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const getReportByRenter = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const skip = Number(req.query.skip) || 0;
        const take = Number(req.query.take) || 10;

        const result = await getReportByRenterService({
            renterId: userId,
            skip,
            take,
        });

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const getReportByOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const skip = Number(req.query.skip) || 0;
        const take = Number(req.query.take) || 10;
        const status = req.query.status as ReportFilterStatus;
        const sort = req.query.sort as ReportSort;

        const result = await getReportByOwnerService({
            ownerId: userId,
            skip,
            take,
            sort,
            status,
        });

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const getReportByAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const skip = Number(req.query.skip) || 0;
        const take = Number(req.query.take) || 10;
        const status = req.query.status as ReportFilterStatus;
        const type = req.query.type as ReportType;

        const result = await getReportByAdminService({
            skip,
            take,
            status,
            type,
        });

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
