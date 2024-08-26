import { ICreateRejectReason } from '../interfaces/rejectReason';
import prisma from '../prisma/prismaClient';

export const addRejectReason = (rejectReason: ICreateRejectReason) => {
    return prisma.rejectReason.createMany({
        data: rejectReason.property_ids.map((property_id) => ({
            property_id,
            reason: rejectReason.reason,
        })),
    });
};
