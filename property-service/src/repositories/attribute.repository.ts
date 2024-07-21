import { Attribute } from '@prisma/client';
import prisma from '../prisma/prismaClient';

export const createAttribute = async (
    attribute: Omit<Attribute, 'attribute_id' | 'created_at' | 'updated_at' | 'deleted'>,
) => {
    return prisma.attribute.create({
        data: attribute,
    });
};

export const getAllAttributes = async () => {
    return prisma.attribute.findMany({
        where: { deleted: false },
    });
};

export const getAttributeById = async (id: string) => {
    return prisma.attribute.findUnique({
        where: { attribute_id: id, deleted: false },
    });
};

export const updateAttribute = async (
    id: string,
    data: Partial<Omit<Attribute, 'attribute_id' | 'created_at' | 'updated_at'>>,
) => {
    return prisma.attribute.update({
        where: { attribute_id: id },
        data,
    });
};

export const deleteAttribute = async (id: string) => {
    return prisma.attribute.delete({
        where: { attribute_id: id },
    });
};

export const softDeleteAttribute = async (id: string) => {
    return prisma.attribute.update({
        where: { attribute_id: id },
        data: { deleted: true },
    });
};
