import slug from 'slug';
import { v4 } from 'uuid';
import { ICreateProperty, IDeleteProperty, IResRepositoryProperty } from '../interfaces/property';
import prisma from '../prisma/prismaClient';
import { convertToISODate } from '../utils/convertToISODate.util';
import { options } from '../utils/slug.util';

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
    Owner: true,
};

const propertiesInclude = {
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
    Owner: {
        select: {
            user_id: true,
            name: true,
            phone_number: true,
            avatar: true,
            email: true,
        },
    },
    latitude: false,
    longitude: false,
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
    latitude,
    longitude,
}: ICreateProperty): Promise<IResRepositoryProperty> => {
    const address = await prisma.address.create({
        data: {
            city,
            district,
            ward,
            street,
        },
    });

    const propertySlug = slug(title, options) + '-' + v4();

    return prisma.property.create({
        data: {
            property_id: v4(),
            slug: propertySlug,
            latitude,
            longitude,
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

export const getAllProperties = async (): Promise<Array<IResRepositoryProperty>> => {
    return prisma.property.findMany({
        where: {
            deleted: false,
        },
        include: propertiesInclude,
    });
};

export const getPropertyBySlug = async (slug: string) => {
    return prisma.property.findUnique({
        where: {
            slug,
        },
        include: propertyInclude,
    });
};

export const deletePropertyById = async (deleteProperty: IDeleteProperty) => {
    return prisma.property.update({
        where: deleteProperty,
        data: {
            deleted: true,
        },
    });
};

// TODO: Detail: lịch sử giá(theo khu vục + theo quý)
// TODO: so sánh(So sánh giá khu vực lân cận + Giá thuê phổ biến nhất: theo phường),
// TODO: bản đồ
// TODO: dành cho bạn (gợi ý)
// TODO: tin đã xem
