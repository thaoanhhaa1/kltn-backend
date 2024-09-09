import { User } from '@prisma/client';
import { ForgotPasswordInput, UpdateInput } from '../schemas/user.schema';

export type IUpdateUserParams = UpdateInput & {
    avatar?: string;
};

export type IUserId = Pick<User, 'userId'>['userId'];

export type IForgotPasswordParams = Omit<ForgotPasswordInput, 'otp'>;
