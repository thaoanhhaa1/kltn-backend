import { User } from '@prisma/client';
import prisma from '../prisma/prismaClient';
import { IUserId } from '../interfaces/user';

export const createUser = async (user: User) => {
    return prisma.user.create({
        data: user,
    });
};

export const updateUser = (userId: IUserId, user: Omit<User, 'userId'>) => {
    return prisma.user.update({
        where: {
            userId,
        },
        data: user,
    });
};

export const findUserById = (userId: IUserId) => {
    return prisma.user.findFirst({
        where: {
            userId,
            walletAddress: {
                not: null,
            },
        },
    });
};
