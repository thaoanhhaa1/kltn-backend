import { IProperty } from '../interfaces/property';
import prisma from '../prisma/prismaClient';

export const createProperty = ({ address, address_id, ...property }: IProperty) => {
    return prisma.property.create({
        data: {
            ...property,
            Address: {
                connectOrCreate: {
                    where: {
                        address_id,
                    },
                    create: address,
                },
            },
        },
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

export const updateProperty = (
    property_id: string,
    { address, address_id, ...property }: Omit<IProperty, 'property_id'>,
) => {
    return prisma.property.update({
        where: {
            property_id,
        },
        data: {
            ...property,
            Address: {
                connectOrCreate: {
                    where: {
                        address_id,
                    },
                    create: address,
                },
            },
        },
    });
};
