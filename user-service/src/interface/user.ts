import { User } from '@prisma/client';
import { ForgotPasswordInput, UpdateInput } from '../schemas/user.schema';

export type IUpdateUserParams = UpdateInput & {
    avatar?: string;
};

export type IUserId = Pick<User, 'user_id'>['user_id'];

export type IForgotPasswordParams = Omit<ForgotPasswordInput, 'otp'>;
