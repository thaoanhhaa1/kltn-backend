import { UserPropertyInteraction } from '@prisma/client';
import { IPagination, IPaginationResponse } from '../interface/pagination';
import {
    IPropertyInteractionDeleteReq,
    IPropertyInteractionInput,
    IPropertyInteractionRes,
    IPropertyInteractionUpdateReq,
} from '../interface/propertyInteraction';
import { IUserId } from '../interface/user';
import { getPropertyInteractionEmbedById } from '../repositories/property.repository';
import {
    countFavoritePropertyInteractions,
    createPropertyInteraction,
    deletePropertyInteraction,
    getAllFavoritePropertyInteractions,
    getAllPropertyInteraction,
    getFavoritePropertyInteractionByPropertyId,
    getFavoritePropertyInteractionBySlug,
    getFavoritePropertyInteractions,
    getPropertyInteractionById,
    softDeletePropertyInteraction,
    updatePropertyInteraction,
} from '../repositories/propertyInteraction.repository';
import CustomError from '../utils/error.util';
import getPageInfo from '../utils/getPageInfo';

export const createPropertyInteractionService = async ({
    propertyId,
    ...rest
}: IPropertyInteractionInput): Promise<IPropertyInteractionRes> => {
    const [property, interaction] = await Promise.all([
        getPropertyInteractionEmbedById(propertyId),
        getFavoritePropertyInteractionByPropertyId(rest.userId, propertyId),
    ]);

    if (!property) throw new CustomError(404, 'Không tìm thấy bất động sản');

    if (interaction)
        return updatePropertyInteraction({
            ...rest,
            interactionId: interaction.interactionId,
        });

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

export const updatePropertyInteractionService = async (params: IPropertyInteractionUpdateReq) => {
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

export const getAllFavoritePropertyInteractionsService = async (userId: IUserId) => {
    return getAllFavoritePropertyInteractions(userId);
};

export const getFavoritePropertyInteractionsService = async (userId: IUserId, pagination: IPagination) => {
    const [favorites, count] = await Promise.all([
        getFavoritePropertyInteractions(userId, pagination),
        countFavoritePropertyInteractions(userId),
    ]);

    const result: IPaginationResponse<UserPropertyInteraction> = {
        data: favorites,
        pageInfo: getPageInfo({
            count,
            ...pagination,
        }),
    };

    return result;
};

export const countFavoritePropertyInteractionsService = (userId: IUserId) => {
    return countFavoritePropertyInteractions(userId);
};

export const getFavoritePropertyInteractionBySlugService = (userId: IUserId, slug: string) => {
    return getFavoritePropertyInteractionBySlug(userId, slug);
};
