import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
    countNewNotificationsByUserIdService,
    getNotificationsByUserIdService,
    updateNotificationStatusService,
} from '../services/notification.service';
import { ResponseType } from '../types/response.type';

export const getNotificationsByUserId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const pagination = {
            take: parseInt(req.query.take as string) || 10,
            skip: parseInt(req.query.skip as string) || 0,
        };

        const notifications = await getNotificationsByUserIdService(userId, pagination);

        res.status(200).json(notifications);
    } catch (error) {
        next(error);
    }
};

export const countNewNotificationsByUserId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const count = await countNewNotificationsByUserIdService(userId);

        const result: ResponseType = {
            message: 'Số thông báo mới',
            statusCode: 200,
            data: count,
            success: true,
        };

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const updateNotificationStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { notificationIds, status } = req.body;

        await updateNotificationStatusService({
            notificationIds,
            status,
            userId,
        });

        res.status(200).json({
            message: 'Cập nhật trạng thái thông báo thành công',
            statusCode: 200,
            success: true,
        });
    } catch (error) {
        next(error);
    }
};