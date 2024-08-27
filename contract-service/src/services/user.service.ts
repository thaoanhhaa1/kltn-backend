import { User } from '@prisma/client';
import { createUser } from '../repositories/user.repository';

export const createUserService = (user: User) => {
    return createUser(user);
};
