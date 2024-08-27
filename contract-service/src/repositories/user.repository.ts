import { User } from '@prisma/client';
import prisma from '../prisma/prismaClient';

export const createUser = async (user: User) => {
    return prisma.user.create({
        data: user,
    });
};

export const updateUser = (userId: number, user: Omit<User, 'user_id'>) => {
    return prisma.user.update({
        where: {
            user_id: userId,
        },
        data: user,
    });
};
