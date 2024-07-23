import { UserInteractionType } from '@prisma/client';
import {
    IPropertyInteractionDeleteReq,
    IPropertyInteractionReq,
    IPropertyInteractionRes,
    IPropertyInteractionUpdateReq,
} from '../interfaces/propertyInteraction';
import prisma from '../prisma/prismaClient';
import CustomError from '../utils/error.util';

export const createPropertyInteraction = async (
    interaction: IPropertyInteractionReq,
): Promise<IPropertyInteractionRes> => {
    return prisma.userPropertyInteractions.create({ data: interaction });
};

export const getAllPropertyInteraction = async (userId: number): Promise<Array<IPropertyInteractionRes>> => {
    return prisma.userPropertyInteractions.findMany({
        where: {
            user_id: userId,
            deleted: false,
        },
    });
};

export const getPropertyInteractionById = async (interaction_id: string): Promise<IPropertyInteractionRes | null> => {
    return prisma.userPropertyInteractions.findUnique({ where: { interaction_id, deleted: false } });
};

export const updatePropertyInteraction = async ({
    user_id,
    interaction_type,
    interaction_id,
}: IPropertyInteractionUpdateReq): Promise<IPropertyInteractionRes> => {
    return prisma.userPropertyInteractions.update({
        where: { interaction_id, user_id },
        data: {
            interaction_type,
        },
    });
};

export const softDeletePropertyInteraction = async ({
    interaction_id,
    user_id,
}: IPropertyInteractionDeleteReq): Promise<IPropertyInteractionRes> => {
    return prisma.userPropertyInteractions.update({
        where: { interaction_id, user_id },
        data: {
            deleted: true,
        },
    });
};

export const deletePropertyInteraction = async ({
    interaction_id,
    user_id,
}: IPropertyInteractionDeleteReq): Promise<IPropertyInteractionRes> => {
    return prisma.userPropertyInteractions.delete({ where: { interaction_id, user_id } });
};
