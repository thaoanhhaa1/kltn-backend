import { findUserDTOByEmail } from '../repositories/user.repository';

export const getMyInfoService = async (email: string) => {
    return await findUserDTOByEmail(email);
};

export const isExistingUser = async (email: string) => {
    return Boolean(await findUserDTOByEmail(email));
};
