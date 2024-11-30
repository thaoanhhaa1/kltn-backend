import { RentalRequestStatus } from '@prisma/client';
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { createRentalRequestSchema } from '../schemas/rentalRequest.schema';
import { createNotificationQueue } from '../services/rabbitmq.service';
import {
    createRentalRequestService,
    generateContractService,
    getRentalRequestAndPropertyByIdService,
    getRentalRequestByOwnerService,
    getRentalRequestByRenterService,
    getRentalRequestsByOwnerService,
    getRentalRequestsByRenterService,
    getRenterRequestByOwnerService,
    ownerUpdateRentalRequestStatusService,
    renterUpdateRentalRequestStatusService,
} from '../services/rentalRequest.service';
import { findUserByIdService } from '../services/user.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';
import CustomError from '../utils/error.util';
import { getPendingRentalRequestsByOwnerService } from './../services/rentalRequest.service';

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
                message: 'Dữ liệu không hợp lệ',
                status: 400,
            });
        }

        const rentalRequest = await createRentalRequestService(safeParse.data);

        findUserByIdService(userId)
            .then((user) =>
                createNotificationQueue({
                    title: 'Yêu cầu thuê nhà mới',
                    body: `Bạn có một yêu cầu thuê nhà mới từ **${user?.name}**`,
                    to: rentalRequest.ownerId,
                    type: 'RENTAL_REQUEST',
                    from: userId,
                    docId: String(rentalRequest.requestId),
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
        const status = req.query.status as RentalRequestStatus;

        const rentalRequests = await getRentalRequestsByRenterService({
            renterId: userId,
            skip,
            take,
            status,
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
        const propertyId = req.query.propertyId as string;
        const rentalPrice = Number(req.query.rentalPrice);
        const rentalDeposit = Number(req.query.rentalDeposit);
        const rentalStartDate = req.query.rentalStartDate as string;
        const rentalEndDate = req.query.rentalEndDate as string;
        const status = req.query.status as RentalRequestStatus;
        const renterId = req.query.renterId as string;

        const rentalRequests = await getRentalRequestsByOwnerService({
            ownerId: userId,
            skip,
            take,
            propertyId,
            rentalPrice,
            rentalDeposit,
            rentalStartDate,
            rentalEndDate,
            status,
            renterId,
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

        if (status === 'APPROVED') throw new CustomError(400, 'Không thể cập nhật trạng thái yêu cầu thuê thành công');

        const rentalRequest = await ownerUpdateRentalRequestStatusService({
            ownerId: userId,
            requestId,
            status,
        });

        if (!rentalRequest.count) throw new CustomError(400, 'Cập nhật trạng thái yêu cầu thuê không thành công');

        const result = {
            success: true,
            message: 'Cập nhật trạng thái yêu cầu thuê thành công',
            statusCode: 200,
        };

        getRentalRequestAndPropertyByIdService(requestId)
            .then((request) =>
                createNotificationQueue({
                    title: 'Yêu cầu thuê nhà',
                    body: `Yêu cầu thuê nhà **${request.property.title}** của bạn đã bị **từ chối**`,
                    type: 'RENTER_RENTAL_REQUEST',
                    docId: String(requestId),
                    from: userId,
                    to: request.renterId,
                }),
            )
            .then(() => console.log('Notification created'))
            .catch((error) => console.log('Notification error', error));

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

        const result = {
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

export const getPendingRentalRequestsByOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const skip = Number(req.query.skip || 0);
        const take = Number(req.query.take || 10);

        const result = await getPendingRentalRequestsByOwnerService(userId, { skip, take });

        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const getRenterRequestByOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const rentalRequest = await getRenterRequestByOwnerService(userId);

        res.json(rentalRequest);
    } catch (error) {
        next(error);
    }
};
