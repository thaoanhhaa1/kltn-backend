import { User } from '@prisma/client';
import { createUser, findUserById, updateUser } from '../repositories/user.repository';
import { IUserId } from '../interfaces/user';

export const createUserService = (user: User) => {
    return createUser(user);
};

export const updateUserService = (userId: IUserId, user: Omit<User, 'userId'>) => updateUser(userId, user);

export const findUserByIdService = (userId: IUserId) => {
    return findUserById(userId);
};
