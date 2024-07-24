import prisma from '../prisma/prismaClient';
import { RegisterInput } from '../schemas/auth.schema';

export const findUserByEmail = async (email: string) => {
    return await prisma.user.findUnique({ where: { email } });
};

export const findUserDTOByEmail = async (email: string) => {
    return await prisma.user.findUnique({
        where: { email },
        select: {
            user_id: true,
            email: true,
            name: true,
            user_types: true,
            avatar: true,
            phone_number: true,
            wallet_address: true,
            created_at: true,
            updated_at: true,
        },
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
        select: {
            user_id: true,
            email: true,
            name: true,
            user_types: true,
            avatar: true,
            phone_number: true,
        },
    });
};
