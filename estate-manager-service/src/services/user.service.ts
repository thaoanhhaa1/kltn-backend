import { UserBaseEmbed } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { IPagination } from '../interface/pagination';
import { IForgotPasswordParams, IUpdateUserParams, IUserId, IVerifyRequest } from '../interface/user';
import prisma from '../prisma/prismaClient';
import { updateUserInfoInConversation } from '../repositories/conversation.repository';
import { updateUserInfoInProperty } from '../repositories/property.repository';
import { updateOwnerInfoInReview, updateUserInfoInReview } from '../repositories/review.repository';
import {
    countUsers,
    findPassword,
    findUserById,
    findUserByPhone,
    findUserDTOByEmail,
    forgotPassword,
    getAllOwnersCbb,
    getRenterCbb,
    getUsers,
    updatePassword,
    updateStatus,
    updateUser,
    updateWalletAddress,
    verifyUser,
} from '../repositories/user.repository';
import { findByCardId, verifyUserDetail } from '../repositories/userDetail.repository';
import { UpdatePasswordInput } from '../schemas/user.schema';
import CustomError, { EntryError } from '../utils/error.util';

export const getMyInfoService = async (email: string) => {
    return await findUserDTOByEmail(email);
};

export const isExistingUser = async (email: string) => {
    return Boolean(await findUserDTOByEmail(email));
};

export const getUsersService = async (params: IPagination) => {
    const [users, count] = await Promise.all([getUsers(params), countUsers()]);

    const current = params.skip / params.take + 1;

    return {
        data: users,
        pageInfo: {
            current,
            pageSize: params.take,
            total: count,
        },
    };
};

export const updateUserService = async (userId: IUserId, user: IUpdateUserParams) => {
    if (user.phoneNumber) {
        const findUser = await findUserByPhone(user.phoneNumber);

        if (findUser && findUser.userId !== userId) throw new CustomError(400, 'Số điện thoại đã được sử dụng');
    }

    const userData = await findUserById(userId);

    const userBaseEmbed: UserBaseEmbed = {
        avatar: userData?.avatar ?? user.avatar ?? null,
        name: user.name,
        userId,
    };
    const userPropertyEmbed = {
        ...userBaseEmbed,
        phoneNumber: user.phoneNumber ?? null,
    };

    const [userUpdated] = await prisma.$transaction([
        updateUser(userId, user),
        updateUserInfoInConversation(userBaseEmbed),
        updateUserInfoInProperty(userPropertyEmbed),
        updateUserInfoInReview(userBaseEmbed),
        updateOwnerInfoInReview(userBaseEmbed),
    ]);

    return userUpdated;
};

export const updatePasswordService = async (userId: IUserId, { oldPassword, password }: UpdatePasswordInput) => {
    const user = await findPassword(userId);

    if (!user) throw new CustomError(404, 'User not found');

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
        throw new EntryError(400, 'Invalid password', [
            {
                field: 'oldPassword',
                error: 'Mật khẩu không đúng',
            },
        ]);

    const hashedPassword = await bcrypt.hash(password, 10);
    return updatePassword(userId, hashedPassword);
};

export const forgotPasswordService = async ({ password, email }: IForgotPasswordParams) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    return forgotPassword({
        email,
        password: hashedPassword,
    });
};

export const getAllOwnersCbbService = () => {
    return getAllOwnersCbb();
};

export const updateWalletAddressService = async (userId: IUserId, wallet_address: string) => {
    try {
        return await updateWalletAddress(userId, wallet_address);
    } catch (error) {
        throw new CustomError(400, 'Ví đã được sử dụng');
    }
};

export const findUserByIdService = async (userId: IUserId) => {
    try {
        return await findUserById(userId);
    } catch (error) {
        throw new CustomError(404, 'Không tìm thấy người dùng');
    }
};

export const verifyUserService = async (userId: IUserId, { name, ...rest }: IVerifyRequest) => {
    try {
        const userDetail = await findByCardId(rest.cardId);

        if (userDetail) throw new CustomError(400, 'CCCD đã được sử dụng');

        const [user] = await prisma.$transaction([verifyUser(userId, { name }), verifyUserDetail(userId, rest)]);

        return user;
    } catch (error) {
        console.log(error);

        throw new CustomError(400, 'Không thể xác thực người dùng');
    }
};

export const blockUserService = (userId: IUserId) => {
    return updateStatus(userId, 'BLOCKED');
};

export const activeUserService = (userId: IUserId) => {
    return updateStatus(userId, 'ACTIVE');
};

export const getRenterCbbService = async () => {
    const users = await getRenterCbb();

    return users;
};
