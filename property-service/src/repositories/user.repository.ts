import { User } from '@prisma/client';
import { ICreateUserReq, ICreateUserRes } from '../interfaces/user';
import prisma from '../prisma/prismaClient';

export const createUser = (user: ICreateUserReq): Promise<ICreateUserRes> => {
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
