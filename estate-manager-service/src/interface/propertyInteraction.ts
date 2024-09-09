import { UserInteractionType, UserPropertyInteraction } from '@prisma/client';
import { IUserId } from './user';

export type IPropertyInteractionInput = {
    propertyId: UserPropertyInteraction['property']['propertyId'];
    userId: IUserId;
    interactionType: UserInteractionType;
};

export type IPropertyInteractionReq = Pick<UserPropertyInteraction, 'interactionType' | 'userId' | 'property'>;
export type IPropertyInteractionRes = UserPropertyInteraction;

export type IPropertyInteractionUpdateReq = {
    interactionType: UserInteractionType;
    interactionId: string;
    userId: IUserId;
};

export type IPropertyInteractionDeleteReq = {
    interactionId: string;
    userId: IUserId;
};
