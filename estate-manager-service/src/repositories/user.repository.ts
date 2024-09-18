import { IPagination } from '../interface/pagination';
import prisma from '../prisma/prismaClient';
import { RegisterInput } from '../schemas/auth.schema';
import { IForgotPasswordParams, IUpdateUserParams, IUserId, IVerifyUser } from '../interface/user';
import { UserStatus } from '@prisma/client';

const userDTOSelect = {
    userId: true,
    email: true,
    name: true,
    userTypes: true,
    avatar: true,
    phoneNumber: true,
    walletAddress: true,
    createdAt: true,
    updatedAt: true,
    isVerified: true,
};

export const adminSelect = {
    ...userDTOSelect,
    status: true,
};

export const findUserByEmail = async (email: string) => {
    return await prisma.user.findUnique({ where: { email } });
};

export const findUserDTOByEmail = async (email: string) => {
    return await prisma.user.findUnique({
        where: { email },
        select: userDTOSelect,
    });
};

export const createUser = async ({ email, name, password, userType }: Omit<RegisterInput, 'otp'>) => {
    return await prisma.user.create({
        data: {
            email,
            name,
            password,
            userTypes: [userType],
        },
        select: userDTOSelect,
    });
};

export const getUsers = async ({ skip, take }: IPagination) => {
    return await prisma.user.findMany({
        where: {
            NOT: {
                userTypes: {
                    has: 'admin',
                },
            },
        },
        select: adminSelect,
        take,
        skip,
    });
};

export const countUsers = () => {
    return prisma.user.count({
        where: {
            NOT: {
                userTypes: {
                    has: 'admin',
                },
            },
        },
    });
};

export const updateUser = (userId: IUserId, user: IUpdateUserParams) => {
    return prisma.user.update({
        where: { userId: userId },
        data: user,
        select: userDTOSelect,
    });
};

export const findUserByPhone = async (phoneNumber: string) => {
    return await prisma.user.findFirst({ where: { phoneNumber } });
};

export const updatePassword = (userId: IUserId, password: string) => {
    return prisma.user.update({ where: { userId: userId }, data: { password } });
};

export const findPassword = (userId: IUserId) => {
    return prisma.user.findUnique({ where: { userId: userId }, select: { password: true } });
};

export const forgotPassword = async ({ email, password }: IForgotPasswordParams) => {
    return await prisma.user.update({
        where: { email },
        data: { password },
    });
};

export const getAllOwnersCbb = () => {
    return prisma.user.findMany({
        where: {
            userTypes: {
                has: 'owner',
            },
        },
        select: {
            userId: true,
            name: true,
        },
    });
};

export const updateWalletAddress = (userId: IUserId, walletAddress: string) => {
    return prisma.user.update({
        where: { userId: userId },
        data: { walletAddress },
        select: userDTOSelect,
    });
};

export const findUserById = (userId: IUserId) => {
    return prisma.user.findUnique({ where: { userId }, select: userDTOSelect });
};

export const findOwnerId = (userId: IUserId) => {
    return prisma.user.findUnique({
        where: {
            userId,
            userTypes: {
                hasSome: ['owner'],
            },
        },
        select: userDTOSelect,
    });
};

export const verifyUser = (userId: IUserId, { name }: IVerifyUser) => {
    return prisma.user.update({
        where: { userId },
        data: {
            name,
            isVerified: true,
        },
        select: userDTOSelect,
    });
};

export const updateStatus = (userId: IUserId, status: UserStatus) => {
    return prisma.user.update({
        where: { userId },
        data: {
            status,
        },
        select: adminSelect,
    });
};

export const isConnectToWallet = (userId: IUserId) => {
    return prisma.user.findUnique({
        where: { userId, walletAddress: { not: null } },
        select: {
            walletAddress: true,
        },
    });
};
