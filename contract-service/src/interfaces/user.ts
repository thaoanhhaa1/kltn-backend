import { User } from '@prisma/client';

export type IUserId = User['userId'];
export type UserType = 'admin' | 'owner' | 'renter';
