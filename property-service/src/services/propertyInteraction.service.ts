import { UserInteractionType } from '@prisma/client';
import {
    IPropertyInteractionDeleteReq,
    IPropertyInteractionReq,
    IPropertyInteractionRes,
    IPropertyInteractionUpdateReq,
} from '../interfaces/propertyInteraction';
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

export const updatePropertyInteractionService = async (
    params: IPropertyInteractionUpdateReq,
): Promise<IPropertyInteractionRes> => {
    return updatePropertyInteraction(params);
};

export const softDeletePropertyInteractionService = async (
    params: IPropertyInteractionDeleteReq,
): Promise<IPropertyInteractionRes> => {
    return softDeletePropertyInteraction(params);
};

export const deletePropertyInteractionService = async (
    params: IPropertyInteractionDeleteReq,
): Promise<IPropertyInteractionRes> => {
    return deletePropertyInteraction(params);
};
