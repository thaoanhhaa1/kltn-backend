import { ICreateProperty, IResRepositoryProperty } from '../interfaces/property';
import prisma from '../prisma/prismaClient';
import { convertToISODate } from '../utils/convertToISODate.util';

const propertyInclude = {
    Address: true,
    PropertyAttributes: {
        include: {
            Attribute: {
                select: {
                    attribute_name: true,
                    attribute_type: true,
                },
            },
        },
    },
    PropertyImages: {
        select: {
            image_url: true,
        },
    },
    RentalConditions: {
        select: {
            condition_type: true,
            condition_value: true,
        },
    },
    RentalPrices: {
        select: {
            rental_price: true,
            start_date: true,
        },
        orderBy: {
            updated_at: 'desc' as const,
        },
    },
};

export const createProperty = async ({
    attributeIds,
    conditions,
    description,
    price,
    title,
    images,
    ownerId,
    city,
    district,
    ward,
    street,
    startDate,
}: ICreateProperty): Promise<IResRepositoryProperty> => {
    const address = await prisma.address.create({
        data: {
            city,
            district,
            ward,
            street,
        },
    });

    return prisma.property.create({
        data: {
            address_id: address.address_id,
            ...(conditions.length && {
                RentalConditions: {
                    createMany: {
                        data: conditions.map(({ type, value }) => ({
                            condition_type: type,
                            condition_value: value,
                        })),
                    },
                },
            }),
            description,
            title,
            ...(attributeIds.length && {
                PropertyAttributes: {
                    createMany: {
                        data: attributeIds.map((id) => ({
                            attribute_id: id,
                        })),
                    },
                },
            }),
            RentalPrices: {
                create: {
                    rental_price: price,
                    ...(startDate && {
                        start_date: convertToISODate(startDate),
                    }),
                },
            },
            owner_id: ownerId,
            ...(images.length && {
                PropertyImages: {
                    createMany: {
                        data: images.map((url) => ({
                            image_url: url,
                        })),
                    },
                },
            }),
        },
        include: propertyInclude,
    });
};

export const getAllProperties = async () => {
    return prisma.property.findMany({
        where: {
            deleted: false,
        },
        include: propertyInclude,
    });
};
