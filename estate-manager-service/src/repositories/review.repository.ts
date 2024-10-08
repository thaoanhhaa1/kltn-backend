import { UserBaseEmbed } from '@prisma/client';
import prisma from '../prisma/prismaClient';

export const updateUserInfoInReview = ({ userId, ...rest }: UserBaseEmbed) => {
    return prisma.review.updateMany({
        where: {
            user: {
                is: {
                    userId,
                },
            },
        },
        data: {
            user: {
                update: {
                    ...rest,
                },
            },
        },
    });
};
