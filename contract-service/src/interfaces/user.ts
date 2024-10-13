import { User } from '@prisma/client';

export type IUserId = User['userId'];
export type UserType = 'admin' | 'owner' | 'renter';

export type UserDetail = {
    userId: IUserId;
    cardId: string;
    issueLoc: string;
    issueDate: string;
    address: {
        street: String;
        ward: String;
        district: String;
        city: String;
    };
    doe: string;
    idCardFront: string;
    idCardBack: string;
    createdAt: string;
    updatedAt: string;
};
