import { UserType } from '@prisma/client';

export interface ICountNewUsersByTypeAndMonth {
    count: number;
    userType: UserType;
    month: number;
}

export interface ICountPropertyByType {
    _id: {
        id: string;
        name: string;
    };
    count: number;
    avgPrice: number;
}

export interface ICountPropertyByCityAndDistrict {
    _id: {
        city: string;
        district: string;
    };
    count: number;
}
