import { RoleType } from '../middlewares/role.middleware';

export interface ICreateUserReq {
    user_id: number;
    email: string;
    name: string;
    user_types: RoleType[];
    avatar: string | null;
    phone_number: string | null;
}

export interface ICreateUserRes {
    user_id: number;
    email: string;
    name: string;
    user_types: string[];
    avatar: string | null;
    phone_number: string | null;
}
