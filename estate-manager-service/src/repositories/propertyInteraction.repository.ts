import { PropertyInteractionEmbed } from '@prisma/client';
import { IPagination } from '../interface/pagination';
import { IPropertyId } from '../interface/property';
import {
    IPropertyInteractionDeleteReq,
    IPropertyInteractionReq,
    IPropertyInteractionRes,
    IPropertyInteractionUpdateReq,
} from '../interface/propertyInteraction';
import { IUserId } from '../interface/user';
import prisma from '../prisma/prismaClient';

export const createPropertyInteraction = async (
    interaction: IPropertyInteractionReq,
): Promise<IPropertyInteractionRes> => {
    return prisma.userPropertyInteraction.create({ data: interaction });
};

export const getAllPropertyInteraction = async (userId: IUserId): Promise<Array<IPropertyInteractionRes>> => {
    return prisma.userPropertyInteraction.findMany({
        where: {
            userId,
            deleted: false,
        },
    });
};

export const getPropertyInteractionById = async (interactionId: string): Promise<IPropertyInteractionRes | null> => {
    return prisma.userPropertyInteraction.findUnique({ where: { interactionId, deleted: false } });
};

export const getFavoritePropertyInteractions = (userId: IUserId, { skip, take }: IPagination) => {
    return prisma.userPropertyInteraction.findMany({
        where: {
            userId,
            interactionType: 'FAVORITED',
            deleted: false,
        },
        orderBy: {
            updatedAt: 'desc',
        },
        take,
        skip,
    });
};

export const getAllFavoritePropertyInteractions = (userId: IUserId) => {
    return prisma.userPropertyInteraction.findMany({
        where: {
            userId,
            interactionType: 'FAVORITED',
            deleted: false,
        },
    });
};

export const countFavoritePropertyInteractions = (userId: IUserId) => {
    return prisma.userPropertyInteraction.count({
        where: {
            userId,
            interactionType: 'FAVORITED',
            deleted: false,
        },
    });
};

export const getFavoritePropertyInteractionBySlug = (userId: IUserId, slug: string) => {
    return prisma.userPropertyInteraction.findFirst({
        where: {
            userId,
            interactionType: 'FAVORITED',
            deleted: false,
            property: {
                is: {
                    slug,
                },
            },
        },
    });
};

export const getFavoritePropertyInteractionByPropertyId = (userId: IUserId, propertyId: string) => {
    return prisma.userPropertyInteraction.findFirst({
        where: {
            userId,
            deleted: false,
            property: {
                is: {
                    propertyId,
                },
            },
        },
    });
};

export const updatePropertyInteraction = async ({
    userId,
    interactionType,
    interactionId,
}: IPropertyInteractionUpdateReq) => {
    return prisma.userPropertyInteraction.update({
        where: { interactionId, userId },
        data: {
            interactionType,
        },
    });
};

export const softDeletePropertyInteraction = async ({
    interactionId,
    userId,
}: IPropertyInteractionDeleteReq): Promise<IPropertyInteractionRes> => {
    console.log(interactionId, userId);

    return prisma.userPropertyInteraction.update({
        where: { interactionId, userId },
        data: {
            deleted: true,
        },
    });
};

export const deletePropertyInteraction = async ({
    interactionId,
}: IPropertyInteractionDeleteReq): Promise<IPropertyInteractionRes> => {
    return prisma.userPropertyInteraction.delete({ where: { interactionId } });
};

export const softDeleteByPropertyId = (propertyId: string) => {
    return prisma.userPropertyInteraction.updateMany({
        where: {
            property: {
                is: {
                    propertyId,
                },
            },
        },
        data: {
            deleted: true,
        },
    });
};

export const softDeleteByPropertyIds = (propertyIds: string[]) => {
    return prisma.userPropertyInteraction.updateMany({
        where: {
            property: {
                is: {
                    propertyId: {
                        in: propertyIds,
                    },
                },
            },
        },
        data: {
            deleted: true,
        },
    });
};

export const updateProperty = (propertyId: IPropertyId, data: PropertyInteractionEmbed) => {
    return prisma.userPropertyInteraction.updateMany({
        where: {
            property: {
                is: {
                    propertyId,
                },
            },
        },
        data,
    });
};
