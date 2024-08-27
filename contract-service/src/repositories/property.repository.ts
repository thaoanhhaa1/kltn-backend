import { Property } from '@prisma/client';
import prisma from '../prisma/prismaClient';

export const createProperty = (property: Property) => {
    return prisma.property.create({
        data: property,
    });
};

export const softDeleteProperty = (property_id: string) => {
    return prisma.property.update({
        where: {
            property_id,
        },
        data: {
            deleted: true,
        },
    });
};

export const updateProperty = (property_id: string, property: Omit<Property, 'property_id'>) => {
    return prisma.property.update({
        where: {
            property_id,
        },
        data: property,
    });
};
