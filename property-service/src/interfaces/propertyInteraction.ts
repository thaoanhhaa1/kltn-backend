import { UserInteractionType, UserPropertyInteractions } from '@prisma/client';

export type IPropertyInteractionReq = Pick<UserPropertyInteractions, 'interaction_type' | 'user_id' | 'property_id'>;
export type IPropertyInteractionRes = UserPropertyInteractions;

export type IPropertyInteractionUpdateReq = {
    interaction_type: UserInteractionType;
    interaction_id: string;
    user_id: number;
};

export type IPropertyInteractionDeleteReq = {
    interaction_id: string;
    user_id: number;
};
