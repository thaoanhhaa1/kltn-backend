import { UserInteractionType } from '@prisma/client';
import {
    IPropertyInteractionDeleteReq,
    IPropertyInteractionInput,
    IPropertyInteractionReq,
    IPropertyInteractionRes,
    IPropertyInteractionUpdateReq,
} from '../interface/propertyInteraction';
import {
    createPropertyInteraction,
    deletePropertyInteraction,
    getAllPropertyInteraction,
    getPropertyInteractionById,
    softDeletePropertyInteraction,
    updatePropertyInteraction,
} from '../repositories/propertyInteraction.repository';
import { IUserId } from '../interface/user';
import { getPropertyInteractionEmbedById } from '../repositories/property.repository';
import CustomError from '../utils/error.util';

export const createPropertyInteractionService = async ({
    propertyId,
    ...rest
}: IPropertyInteractionInput): Promise<IPropertyInteractionRes> => {
    const property = await getPropertyInteractionEmbedById(propertyId);

    if (!property) throw new CustomError(404, 'Property not found');

    return createPropertyInteraction({
        ...rest,
        property,
    });
};

export const getAllPropertyInteractionService = async (userId: IUserId): Promise<Array<IPropertyInteractionRes>> => {
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
