import { IUserId, IVerifyUserDetail } from '../interface/user';
import prisma from '../prisma/prismaClient';
import { convertDateToDB } from '../utils/convertDate';

export const verifyUserDetail = (userId: IUserId, { doe, issueDate, ...params }: IVerifyUserDetail) => {
    return prisma.userDetail.upsert({
        where: {
            userId,
        },
        create: {
            ...params,
            userId,
            doe: convertDateToDB(doe),
            issueDate: convertDateToDB(issueDate),
        },
        update: params,
    });
};

export const findByCardId = (cardId: string) => {
    return prisma.userDetail.findFirst({
        where: {
            cardId,
        },
    });
};

export const findUserDetailByUserId = (userId: IUserId) => {
    return prisma.userDetail.findFirst({
        where: {
            userId,
        },
    });
};
