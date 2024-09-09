import { ICreateRejectReason } from '../interface/rejectReason';
import prisma from '../prisma/prismaClient';

export const addRejectReason = (rejectReason: ICreateRejectReason) => {
    return prisma.rejectReason.createMany({
        data: rejectReason.property_ids.map((propertyId) => ({
            propertyId,
            reason: rejectReason.reason,
        })),
    });
};
