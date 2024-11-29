import { ICreateRejectReason } from '../interface/rejectReason';
import prisma from '../prisma/prismaClient';

export const addRejectReason = (rejectReason: ICreateRejectReason) => {
    return prisma.rejectReason.createMany({
        data: rejectReason.propertyIds.map((propertyId) => ({
            propertyId,
            reason: rejectReason.reason,
        })),
    });
};

export const getRejectReasonsByPropertyId = (propertyId: string) => {
    return prisma.rejectReason.findMany({
        where: {
            propertyId,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
};
