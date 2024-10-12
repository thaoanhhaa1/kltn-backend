import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { createRentalRequestSchema } from '../schemas/rentalRequest.schema';
import { createNotificationService } from '../services/notification.service';
import {
    createRentalRequestService,
    generateContractService,
    getRentalRequestByOwnerService,
    getRentalRequestByRenterService,
    getRentalRequestsByOwnerService,
    getRentalRequestsByRenterService,
    ownerUpdateRentalRequestStatusService,
    renterUpdateRentalRequestStatusService,
} from '../services/rentalRequest.service';
import { findUserByIdService } from '../services/user.service';
import { ResponseType } from '../types/response.type';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';
import CustomError from '../utils/error.util';

export const createRentalRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const safeParse = createRentalRequestSchema.safeParse({
            ...req.body,
            renterId: userId,
        });

        if (!safeParse.success) {
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
                message: 'Invalid rental request data',
                status: 400,
            });
        }

        const rentalRequest = await createRentalRequestService(safeParse.data);

        findUserByIdService(userId)
            .then((user) =>
                createNotificationService({
                    title: 'Yêu cầu thuê nhà mới',
                    body: `Bạn có một yêu cầu thuê nhà mới từ ${user?.name}`,
                    to: rentalRequest.ownerId,
                    type: 'RENTAL_REQUEST',
                    from: userId,
                    docId: rentalRequest.requestId,
                }),
            )
            .then(() => console.log('Notification created'))
            .catch((error) => console.log('Notification error', error));

        res.status(201).json(rentalRequest);
    } catch (error) {
        next(error);
    }
};

export const getRentalRequestsByRenter = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const take = Number(req.query.take || 10);
        const skip = Number(req.query.skip || 0);

        const rentalRequests = await getRentalRequestsByRenterService(userId, {
            skip,
            take,
        });

        res.json(rentalRequests);
    } catch (error) {
        next(error);
    }
};

export const getRentalRequestsByOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const take = Number(req.query.take || 10);
        const skip = Number(req.query.skip || 0);

        const rentalRequests = await getRentalRequestsByOwnerService(userId, {
            skip,
            take,
        });

        res.json(rentalRequests);
    } catch (error) {
        next(error);
    }
};

export const getRentalRequestByRenter = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const slug = req.params.slug;

        const rentalRequest = await getRentalRequestByRenterService(userId, slug);

        res.json(rentalRequest);
    } catch (error) {
        next(error);
    }
};

export const getRentalRequestByOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const slug = req.params.slug;

        const rentalRequest = await getRentalRequestByOwnerService(userId, slug);

        res.json(rentalRequest);
    } catch (error) {
        next(error);
    }
};

export const ownerUpdateRentalRequestStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { requestId, status } = req.body;

        const rentalRequest = await ownerUpdateRentalRequestStatusService({
            ownerId: userId,
            requestId,
            status,
        });

        if (!rentalRequest.count) throw new CustomError(400, 'Cập nhật trạng thái yêu cầu thuê không thành công');

        const result: ResponseType = {
            success: true,
            message: 'Cập nhật trạng thái yêu cầu thuê thành công',
            statusCode: 200,
        };

        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const renterUpdateRentalRequestStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { requestId, status } = req.body;

        const rentalRequest = await renterUpdateRentalRequestStatusService({
            renterId: userId,
            requestId,
            status,
        });

        if (!rentalRequest.count) throw new CustomError(400, 'Cập nhật trạng thái yêu cầu thuê không thành công');

        const result: ResponseType = {
            success: true,
            message: 'Cập nhật trạng thái yêu cầu thuê thành công',
            statusCode: 200,
        };

        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const generateContract = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { propertyId, renterId, requestId } = req.body;

        if (!propertyId || !renterId || !requestId) {
            throw new CustomError(400, 'Dữ liệu không hợp lệ');
        }

        const result = await generateContractService({
            ownerId: req.user!.id,
            propertyId,
            renterId,
            requestId,
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
};
