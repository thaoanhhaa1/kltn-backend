import { IUserId } from '../interface/user';
import {
    IPropertyInteractionDeleteReq,
    IPropertyInteractionReq,
    IPropertyInteractionRes,
    IPropertyInteractionUpdateReq,
} from '../interface/propertyInteraction';
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

export const updatePropertyInteraction = async ({
    userId,
    interactionType,
    interactionId,
}: IPropertyInteractionUpdateReq): Promise<IPropertyInteractionRes> => {
    console.log(interactionId, userId);

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
    userId,
}: IPropertyInteractionDeleteReq): Promise<IPropertyInteractionRes> => {
    return prisma.userPropertyInteraction.delete({ where: { interactionId, userId } });
};
