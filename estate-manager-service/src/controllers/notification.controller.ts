import { UserType } from '@prisma/client';
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
    countNewNotificationsByUserIdService,
    getNotificationsByUserIdService,
    readAllNotificationsService,
    updateNotificationStatusService,
} from '../services/notification.service';
import { ResponseType } from '../types/response.type';

export const getNotificationsByUserId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userTypes = req.user!.userTypes as UserType[];

        const pagination = {
            take: parseInt(req.query.take as string) || 10,
            skip: parseInt(req.query.skip as string) || 0,
        };

        const notifications = await getNotificationsByUserIdService({ userId, pagination, userTypes });

        res.status(200).json(notifications);
    } catch (error) {
        next(error);
    }
};

export const countNewNotificationsByUserId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userTypes = req.user!.userTypes as UserType[];

        const count = await countNewNotificationsByUserIdService({ userId, userTypes });

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
        const userTypes = req.user!.userTypes as UserType[];

        const { notificationIds, status } = req.body;

        await updateNotificationStatusService({
            notificationIds,
            status,
            userId,
            userTypes,
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

export const readAllNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userTypes = req.user!.userTypes as UserType[];

        await readAllNotificationsService({
            userTypes,
            userId,
        });

        res.status(200).json({
            message: 'Đã đọc tất cả thông báo',
            statusCode: 200,
            success: true,
        });
    } catch (error) {
        next(error);
    }
};
