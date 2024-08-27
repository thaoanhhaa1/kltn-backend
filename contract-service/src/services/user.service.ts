import { User } from '@prisma/client';
import { createUser, updateUser } from '../repositories/user.repository';

export const createUserService = (user: User) => {
    return createUser(user);
};

export const updateUserService = (userId: number, user: Omit<User, 'user_id'>) => updateUser(userId, user);
