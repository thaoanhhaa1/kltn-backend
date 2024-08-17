import { IPagination } from '../interface/IPagination';
import { countUsers, findUserDTOByEmail, getUsers } from '../repositories/user.repository';

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
