import { User } from '@prisma/client';
import { createUser, updateUser } from '../repositories/user.repository';
import { IUserId } from '../interfaces/user';

export const createUserService = (user: User) => {
    return createUser(user);
};

export const updateUserService = (userId: IUserId, user: Omit<User, 'user_id'>) => updateUser(userId, user);
