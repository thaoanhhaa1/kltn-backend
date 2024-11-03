import prisma from '../prisma/prismaClient';

export const countAttributes = (attributeId: string) => {
    return prisma.propertyAttribute.count({
        where: {
            attributeId,
        },
    });
};

export const getPropertyIdByAttributeId = (attributeId: string) => {
    return prisma.propertyAttribute.findMany({
        where: {
            attributeId,
        },
        select: {
            propertyId: true,
        },
    });
};
