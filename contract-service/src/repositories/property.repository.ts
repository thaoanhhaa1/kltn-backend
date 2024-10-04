import { IProperty } from '../interfaces/property';
import prisma from '../prisma/prismaClient';

export const createProperty = ({ address, ...property }: IProperty) => {
    return prisma.property.create({
        data: {
            ...property,
            // addressId: addressRes.addressId,
            address: {
                create: address,
            },
        },
    });
};

export const softDeleteProperty = (propertyId: string) => {
    return prisma.property.update({
        where: {
            propertyId,
        },
        data: {
            deleted: true,
        },
    });
};

export const updateProperty = async (propertyId: string, { address, ...property }: Omit<IProperty, 'propertyId'>) => {
    const addressRes = await prisma.address.create({
        data: address,
    });

    return prisma.property.update({
        where: {
            propertyId,
        },
        data: {
            ...property,
            addressId: addressRes.addressId,
        },
    });
};

export const updatePropertyStatus = (propertyId: string, status: IProperty['status']) => {
    return prisma.property.update({
        where: {
            propertyId,
        },
        data: {
            status,
        },
    });
};
