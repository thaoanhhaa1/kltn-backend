import { ICreateUserReq, ICreateUserRes } from '../interfaces/user';
import prisma from '../prisma/prismaClient';

export const createUser = async (user: ICreateUserReq): Promise<ICreateUserRes> => {
    return prisma.user.create({
        data: user,
    });
};
