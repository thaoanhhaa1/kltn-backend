import { ICreateUserReq, ICreateUserRes } from '../interfaces/user';
import * as userRepository from '../repositories/user.repository';

export const createUser = async (user: ICreateUserReq): Promise<ICreateUserRes> => {
    return userRepository.createUser(user);
};
