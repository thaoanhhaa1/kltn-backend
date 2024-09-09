import bcrypt from 'bcryptjs';
import { IPagination } from '../interface/pagination';
import { IForgotPasswordParams, IUpdateUserParams, IUserId } from '../interface/user';
import {
    countUsers,
    findPassword,
    findUserByPhone,
    findUserDTOByEmail,
    forgotPassword,
    getAllOwnersCbb,
    getUsers,
    updatePassword,
    updateUser,
    updateWalletAddress,
} from '../repositories/user.repository';
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

        if (findUser && findUser.userId !== userId) throw new CustomError(400, 'Phone number is already in use');
    }

    return updateUser(userId, user);
};

export const updatePasswordService = async (userId: IUserId, { oldPassword, password }: UpdatePasswordInput) => {
    const user = await findPassword(userId);

    if (!user) throw new CustomError(404, 'User not found');

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
        throw new EntryError(400, 'Invalid password', [
            {
                field: 'old_password',
                error: 'Old password is incorrect',
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
