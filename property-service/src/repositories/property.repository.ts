import slug from 'slug';
import { v4 } from 'uuid';
import { IPagination } from '../interfaces/pagination';
import {
    ICreateProperty,
    IDeleteProperty,
    IGetPropertiesWithOwnerId,
    IOwnerFilterProperties,
    IPropertyId,
    IResRepositoryProperty,
    IUpdatePropertiesStatus,
    IUpdateProperty,
    IUpdatePropertyStatus,
} from '../interfaces/property';
import { IUserId } from '../interfaces/user';
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

const ownerFilterPropertiesWhere = ({
    city,
    deposit_from,
    deposit_to,
    district,
    price_from,
    price_to,
    status,
    title,
    ward,
}: IOwnerFilterProperties) => ({
    ...(city && {
        Address: {
            city,
        },
    }),
    ...(district && {
        Address: {
            district,
        },
    }),
    ...(ward && {
        Address: {
            ward,
        },
    }),
    ...(title && {
        title: {
            contains: title,
            mode: 'insensitive' as const,
        },
    }),
    ...(status && {
        status,
    }),
    ...((deposit_from || deposit_to) && {
        deposit: {
            ...(deposit_from && {
                gte: deposit_from,
            }),
            ...(deposit_to && {
                lte: deposit_to,
            }),
        },
    }),
    ...((price_from || price_to) && {
        RentalPrices: {
            some: {
                rental_price: {
                    ...(price_from && {
                        gte: price_from,
                    }),
                    ...(price_to && {
                        lte: price_to,
                    }),
                },
            },
        },
    }),
});

export const createProperty = async ({
    attributeIds,
    conditions,
    price,
    title,
    description,
    images,
    ownerId,
    city,
    district,
    ward,
    street,
    startDate,
    ...props
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
            ...props,
            description,
            title,
            property_id: v4(),
            slug: propertySlug,
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
            ...(attributeIds.length && {
                PropertyAttributes: {
                    createMany: {
                        data: attributeIds.map((id) => ({
                            attribute_id: id,
                        })),
                    },
                },
            }),
            ...(price && {
                RentalPrices: {
                    create: {
                        rental_price: price,
                        ...(startDate && {
                            start_date: convertToISODate(startDate),
                        }),
                    },
                },
            }),
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

export const getNotPendingProperties = async (): Promise<Array<IResRepositoryProperty>> => {
    return prisma.property.findMany({
        where: {
            deleted: false,
            status: {
                not: 'PENDING',
            },
        },
        include: propertiesInclude,
    });
};

export const getNotDeletedProperties = async ({ skip, take }: IPagination): Promise<Array<IResRepositoryProperty>> => {
    return prisma.property.findMany({
        where: {
            deleted: false,
        },
        include: propertiesInclude,
        skip,
        take,
    });
};

export const countNotDeletedProperties = async () => {
    return prisma.property.count({
        where: {
            deleted: false,
        },
    });
};

export const getNotDeletedPropertiesByOwnerId = async ({
    skip,
    take,
    ownerId,
    ...filter
}: IGetPropertiesWithOwnerId & IOwnerFilterProperties): Promise<Array<IResRepositoryProperty>> => {
    return prisma.property.findMany({
        where: {
            deleted: false,
            owner_id: ownerId,
            ...ownerFilterPropertiesWhere(filter),
        },
        include: propertiesInclude,
        skip,
        take,
    });
};

export const countNotDeletedPropertiesByOwnerId = async (ownerId: IUserId, filter: IOwnerFilterProperties) => {
    return prisma.property.count({
        where: {
            deleted: false,
            owner_id: ownerId,
            ...ownerFilterPropertiesWhere(filter),
        },
    });
};

export const getNotDeletedProperty = (property_id: IPropertyId) => {
    return prisma.property.findFirst({
        where: {
            property_id,
            deleted: false,
        },
        include: propertyInclude,
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
        where: {
            ...deleteProperty,
            status: {
                not: 'UNAVAILABLE',
            },
        },
        data: {
            deleted: true,
        },
    });
};

export const updateProperty = async (property_id: IPropertyId, property: IUpdateProperty) => {
    const { city, district, ward, street, price, startDate, attributeIds, conditions, images, ownerId, ...rest } =
        property;
    const address = await prisma.address.create({
        data: {
            city,
            district,
            ward,
            street,
        },
    });

    return prisma.property.update({
        where: {
            property_id,
            owner_id: ownerId,
            status: {
                not: 'UNAVAILABLE',
            },
        },
        data: {
            ...rest,
            address_id: address.address_id,
            ...(price && {
                RentalPrices: {
                    create: {
                        rental_price: price,
                        ...(startDate && {
                            start_date: convertToISODate(startDate),
                        }),
                    },
                },
            }),
            PropertyAttributes: {
                deleteMany: {
                    property_id: {
                        equals: property_id,
                    },
                },
                createMany: {
                    data: attributeIds.map((id) => ({
                        attribute_id: id,
                    })),
                },
            },
            RentalConditions: {
                deleteMany: {
                    property_id: {
                        equals: property_id,
                    },
                },
                createMany: {
                    data: conditions.map(({ type, value }) => ({
                        condition_type: type,
                        condition_value: value,
                    })),
                },
            },
            ...(images.length && {
                PropertyImages: {
                    deleteMany: {
                        property_id: {
                            equals: property_id,
                        },
                    },
                    createMany: {
                        data: images.map((url) => ({
                            image_url: url,
                        })),
                    },
                },
            }),
            status: 'PENDING',
        },
        include: propertyInclude,
    });
};

export const updatePropertyStatus = async ({ property_id, status, user_id, isAdmin }: IUpdatePropertyStatus) => {
    return prisma.property.update({
        where: {
            property_id,
            ...(isAdmin ? {} : { owner_id: user_id }),
        },
        data: {
            status,
        },
        include: propertyInclude,
    });
};

export const updatePropertiesStatus = ({ properties, status, owner_id }: IUpdatePropertiesStatus) => {
    return prisma.property.updateMany({
        where: {
            property_id: {
                in: properties,
            },
            ...(owner_id && {
                owner_id,
            }),
            ...(owner_id
                ? {
                      status: {
                          in: ['ACTIVE', 'INACTIVE'],
                      },
                  }
                : {
                      status: {
                          notIn: ['UNAVAILABLE', 'INACTIVE'],
                      },
                  }),
        },
        data: {
            status: {
                set: status,
            },
        },
    });
};

export const getPropertiesDetailByIds = ({ owner_id, properties }: Omit<IUpdatePropertiesStatus, 'status'>) => {
    return prisma.property.findMany({
        where: {
            property_id: {
                in: properties,
            },
            ...(owner_id && {
                owner_id,
            }),
        },
        include: propertiesInclude,
    });
};

// TODO: Detail: lịch sử giá(theo khu vục + theo quý)
// TODO: so sánh(So sánh giá khu vực lân cận + Giá thuê phổ biến nhất: theo phường),
// TODO: bản đồ
// TODO: dành cho bạn (gợi ý)
// TODO: tin đã xem
