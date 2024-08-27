import { User } from '@prisma/client';
import { ICreateUserReq, ICreateUserRes } from '../interfaces/user';
import * as userRepository from '../repositories/user.repository';

export const createUser = (user: ICreateUserReq): Promise<ICreateUserRes> => {
    return userRepository.createUser(user);
};

export const updateUserService = (userId: number, user: Omit<User, 'user_id'>) =>
    userRepository.updateUser(userId, user);
