import { IPagination } from '../interface/IPagination';
import prisma from '../prisma/prismaClient';
import { RegisterInput } from '../schemas/auth.schema';
import { IForgotPasswordParams, IUpdateUserParams, IUserId } from '../interface/user';

const userDTOSelect = {
    user_id: true,
    email: true,
    name: true,
    user_types: true,
    avatar: true,
    phone_number: true,
    wallet_address: true,
    created_at: true,
    updated_at: true,
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
            user_types: [userType],
        },
        select: userDTOSelect,
    });
};

export const getUsers = async ({ skip, take }: IPagination) => {
    return await prisma.user.findMany({
        where: {
            NOT: {
                user_types: {
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
                user_types: {
                    has: 'admin',
                },
            },
        },
    });
};

export const updateUser = (userId: IUserId, user: IUpdateUserParams) => {
    return prisma.user.update({
        where: { user_id: userId },
        data: user,
        select: userDTOSelect,
    });
};

export const findUserByPhone = async (phone_number: string) => {
    return await prisma.user.findUnique({ where: { phone_number } });
};

export const updatePassword = (userId: IUserId, password: string) => {
    return prisma.user.update({ where: { user_id: userId }, data: { password } });
};

export const findPassword = (userId: IUserId) => {
    return prisma.user.findUnique({ where: { user_id: userId }, select: { password: true } });
};

export const forgoPassword = async ({ email, password }: IForgotPasswordParams) => {
    return await prisma.user.update({
        where: { email },
        data: { password },
    });
};
