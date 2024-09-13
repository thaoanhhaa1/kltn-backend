import { ICreateNotification } from '../interface/notification';
import { IPagination } from '../interface/pagination';
import { IUserId } from '../interface/user';
import prisma from '../prisma/prismaClient';

export const createNotification = (params: ICreateNotification) => {
    return prisma.notification.create({
        data: params,
    });
};

export const getNotificationsByUserId = (userId: IUserId, pagination: IPagination) => {
    return prisma.notification.findMany({
        where: {
            to: userId,
            status: {
                not: 'DELETED',
            },
        },
        take: pagination.take,
        skip: pagination.skip,
    });
};

export const countNewNotificationsByUserId = (userId: IUserId) => {
    return prisma.notification.count({
        where: {
            to: userId,
            status: 'RECEIVED',
        },
    });
};

export const countNotificationsByUserId = (userId: IUserId) => {
    return prisma.notification.count({
        where: {
            to: userId,
            status: {
                not: 'DELETED',
            },
        },
    });
};
