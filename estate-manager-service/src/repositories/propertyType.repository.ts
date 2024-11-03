import prisma from '../prisma/prismaClient';
import { IPropertyTypeDTO, PropertyTypeId, PropertyTypeInput } from '../schemas/propertyType.schema';

export const createPropertyType = (data: PropertyTypeInput) => {
    return prisma.propertyType.create({
        data,
    });
};

export const getPropertyTypes = (): Promise<Array<IPropertyTypeDTO>> => {
    return prisma.propertyType.findMany({
        where: {
            deleted: false,
        },
        select: {
            id: true,
            name: true,
        },
    });
};

export const getPropertyTypeDetails = () => {
    return prisma.propertyType.findMany({
        where: {
            deleted: false,
        },
    });
};

export const updatePropertyType = (id: PropertyTypeId, data: PropertyTypeInput) => {
    return prisma.propertyType.update({
        where: {
            id,
        },
        data,
    });
};

export const softDeletePropertyType = (id: PropertyTypeId) => {
    return prisma.propertyType.update({
        where: {
            id,
        },
        data: {
            deleted: true,
        },
    });
};
