import prisma from '../prisma/prismaClient';
import { ICreateAttributeReq, IUpdateAttributeReq } from '../schemas/attribute.schema';

export const createAttribute = async (attribute: ICreateAttributeReq) => {
    return prisma.attribute.create({
        data: attribute,
    });
};

export const getAllAttributes = async () => {
    return prisma.attribute.findMany({
        where: { deleted: false },
        orderBy: {
            createdAt: 'desc',
        },
    });
};

export const getAllAttributesCbb = async () => {
    return prisma.attribute.findMany({
        where: { deleted: false },
        select: {
            id: true,
            name: true,
        },
    });
};

export const getAttributeById = async (id: string) => {
    return prisma.attribute.findUnique({
        where: { id: id, deleted: false },
    });
};

export const updateAttribute = async (id: string, data: IUpdateAttributeReq) => {
    return prisma.attribute.update({
        where: { id: id },
        data,
    });
};

export const deleteAttribute = async (id: string) => {
    return prisma.attribute.delete({
        where: { id: id },
    });
};

export const softDeleteAttribute = async (id: string) => {
    return prisma.attribute.update({
        where: { id: id },
        data: { deleted: true },
    });
};

export const getAttributeByIds = async (ids: string[]) => {
    return prisma.attribute.findMany({
        where: {
            id: {
                in: ids,
            },
        },
        select: {
            name: true,
            type: true,
        },
    });
};
