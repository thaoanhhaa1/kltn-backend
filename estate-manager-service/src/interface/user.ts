import { Address, User } from '@prisma/client';
import { ForgotPasswordInput, UpdateInput } from '../schemas/user.schema';

export type IUpdateUserParams = UpdateInput & {
    avatar?: string;
};

export type IUserId = Pick<User, 'userId'>['userId'];

export type IForgotPasswordParams = Omit<ForgotPasswordInput, 'otp'>;

export interface IVerifyRequest {
    name: string;
    cardId: string;
    issueLoc: string;
    issueDate: string;
    address: Address;
    doe: string;
    idCardFront: string;
    idCardBack: string;
}

export type IVerifyUser = Pick<IVerifyRequest, 'name'>;
export type IVerifyUserDetail = Pick<IVerifyRequest, 'cardId' | 'issueLoc' | 'issueDate' | 'address' | 'doe'>;
