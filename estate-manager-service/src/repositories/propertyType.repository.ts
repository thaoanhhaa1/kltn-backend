import prisma from '../prisma/prismaClient';
import { IPropertyTypeDTO, PropertyTypeInput } from '../schemas/propertyType.schema';

export const createPropertyType = (data: PropertyTypeInput) => {
    return prisma.propertyType.create({
        data,
    });
};

export const getPropertyTypes = (): Promise<Array<IPropertyTypeDTO>> => {
    return prisma.propertyType.findMany({
        select: {
            id: true,
            name: true,
        },
    });
};
