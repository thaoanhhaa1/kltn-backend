import { UserPropertyInteractions } from '@prisma/client';

export type IPropertyInteractionReq = Pick<UserPropertyInteractions, 'interaction_type' | 'user_id' | 'property_id'>;
export type IPropertyInteractionRes = UserPropertyInteractions;
