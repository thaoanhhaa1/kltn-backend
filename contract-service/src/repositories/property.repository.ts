import { IProperty } from '../interfaces/property';
import prisma from '../prisma/prismaClient';

export const createProperty = ({ address, ...property }: IProperty) => {
    return prisma.property.create({
        data: {
            ...property,
            // address_id: addressRes.address_id,
            address: {
                create: address,
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

export const updateProperty = async (property_id: string, { address, ...property }: Omit<IProperty, 'property_id'>) => {
    const addressRes = await prisma.address.create({
        data: address,
    });

    return prisma.property.update({
        where: {
            property_id,
        },
        data: {
            ...property,
            address_id: addressRes.address_id,
        },
    });
};

export const updatePropertyStatus = (property_id: string, status: IProperty['status']) => {
    return prisma.property.update({
        where: {
            property_id,
        },
        data: {
            status,
        },
    });
};
