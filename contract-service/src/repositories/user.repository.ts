import { User } from '@prisma/client';
import prisma from '../prisma/prismaClient';

export const createUser = async (user: User) => {
    return prisma.user.create({
        data: user,
    });
};
