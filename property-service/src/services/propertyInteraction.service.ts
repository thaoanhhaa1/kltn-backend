import { UserInteractionType } from '@prisma/client';
import { IPropertyInteractionReq, IPropertyInteractionRes } from '../interfaces/propertyInteraction';
import {
    createPropertyInteraction,
    deletePropertyInteraction,
    getAllPropertyInteraction,
    getPropertyInteractionById,
    softDeletePropertyInteraction,
    updatePropertyInteraction,
} from '../repositories/propertyInteraction.repository';

export const createPropertyInteractionService = async (
    interaction: IPropertyInteractionReq,
): Promise<IPropertyInteractionRes> => {
    return createPropertyInteraction(interaction);
};

export const getAllPropertyInteractionService = async (userId: number): Promise<Array<IPropertyInteractionRes>> => {
    return getAllPropertyInteraction(userId);
};

export const getPropertyInteractionByIdService = async (
    interaction_id: string,
): Promise<IPropertyInteractionRes | null> => {
    return getPropertyInteractionById(interaction_id);
};

export const updatePropertyInteractionService = async ({
    interaction_type,
    interaction_id,
}: {
    interaction_type: UserInteractionType;
    interaction_id: string;
}): Promise<IPropertyInteractionRes> => {
    return updatePropertyInteraction({ interaction_type, interaction_id });
};

export const softDeletePropertyInteractionService = async (
    interaction_id: string,
): Promise<IPropertyInteractionRes> => {
    return softDeletePropertyInteraction(interaction_id);
};

export const deletePropertyInteractionService = async (interaction_id: string): Promise<IPropertyInteractionRes> => {
    return deletePropertyInteraction(interaction_id);
};
