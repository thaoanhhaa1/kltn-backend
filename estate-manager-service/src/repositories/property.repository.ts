import { PropertyStatus, UserPropertyEmbed } from '@prisma/client';
import { v4 } from 'uuid';
import { IPagination } from '../interface/pagination';
import {
    IDeleteProperty,
    IGetPropertiesWithOwnerId,
    IOwnerFilterProperties,
    IPropertyId,
    IResRepositoryProperty,
    IUpdatePropertiesStatus,
    IUpdateProperty,
    IUpdatePropertyStatus,
    IUpdateRating,
} from '../interface/property';
import { IUserId } from '../interface/user';
import prisma from '../prisma/prismaClient';
import { ICreatePropertyReq } from '../schemas/property.schema';

const propertyInclude = {
    attributes: {
        include: {
            Attribute: {
                select: {
                    name: true,
                    type: true,
                },
            },
        },
    },
};

const propertiesInclude = {
    attributes: {
        include: {
            Attribute: {
                select: {
                    name: true,
                    type: true,
                },
            },
        },
    },
    latitude: false,
    longitude: false,
};

const ownerFilterPropertiesWhere = ({
    city,
    depositFrom,
    depositTo,
    district,
    priceFrom,
    priceTo,
    status,
    title,
    ward,
}: IOwnerFilterProperties) => ({
    address: {
        is: {
            ...(city && { city }),
            ...(district && { district }),
            ...(ward && { ward }),
        },
    },
    ...(title && {
        title: {
            contains: title,
            mode: 'insensitive' as const,
        },
    }),
    ...(status && {
        status,
    }),
    ...((depositFrom || depositTo) && {
        deposit: {
            ...(depositFrom && {
                gte: depositFrom,
            }),
            ...(depositTo && {
                lte: depositTo,
            }),
        },
    }),
    ...((priceFrom || priceTo) && {
        price: {
            ...(priceFrom && {
                gte: priceFrom,
            }),
            ...(priceTo && {
                lte: priceTo,
            }),
        },
    }),
});

export const createProperty = async ({
    attributeIds,
    city,
    street,
    ward,
    district,
    conditions,
    ...property
}: ICreatePropertyReq): Promise<IResRepositoryProperty> => {
    return prisma.property.create({
        data: {
            ...property,
            address: {
                city,
                district,
                ward,
                street,
            },
            ...(attributeIds.length && {
                attributes: {
                    createMany: {
                        data: attributeIds.map((attributeId) => ({
                            attributeId,
                        })),
                    },
                },
            }),
            rentalConditions: conditions,
            propertyId: v4(),
        },
        include: propertiesInclude,
    });
};

export const getNotPendingProperties = async (): Promise<Array<IResRepositoryProperty>> => {
    return prisma.property.findMany({
        where: {
            deleted: false,
            status: {
                notIn: ['INACTIVE', 'PENDING', 'REJECTED'],
            },
        },
        include: propertiesInclude,
    });
};

export const countNotPendingProperties = () => {
    return prisma.property.count({
        where: {
            deleted: false,
            status: {
                notIn: ['INACTIVE', 'PENDING', 'REJECTED'],
            },
        },
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
        orderBy: {
            createdAt: 'desc',
        },
    });
};

export const countNotDeletedProperties = async () => {
    return prisma.property.count({
        where: {
            deleted: false,
            status: {
                in: ['ACTIVE', 'UNAVAILABLE'],
            },
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
            owner: {
                is: {
                    userId: ownerId,
                },
            },
            ...ownerFilterPropertiesWhere(filter),
        },
        include: propertiesInclude,
        orderBy: {
            createdAt: 'desc',
        },
        skip,
        take,
    });
};

export const countNotDeletedPropertiesByOwnerId = async (ownerId: IUserId, filter: IOwnerFilterProperties) => {
    return prisma.property.count({
        where: {
            deleted: false,
            owner: {
                is: {
                    userId: ownerId,
                },
            },
            ...ownerFilterPropertiesWhere(filter),
        },
    });
};

export const getNotDeletedProperty = (propertyId: IPropertyId) => {
    return prisma.property.findFirst({
        where: {
            propertyId,
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

export const getPropertyById = async (propertyId: string) => {
    return prisma.property.findUnique({
        where: {
            propertyId,
        },
        include: propertyInclude,
    });
};

export const deletePropertyById = ({ ownerId, propertyId }: IDeleteProperty) => {
    return prisma.property.update({
        where: {
            propertyId,
            owner: {
                is: {
                    userId: ownerId,
                },
            },
            status: {
                not: 'UNAVAILABLE',
            },
        },
        data: {
            deleted: true,
        },
    });
};

export const updateProperty = async (propertyId: IPropertyId, property: IUpdateProperty) => {
    const { city, district, ward, street, price, startDate, attributeIds, conditions, images, ownerId, ...rest } =
        property;

    return prisma.property.update({
        where: {
            propertyId,
            owner: {
                is: {
                    userId: ownerId,
                },
            },
            status: {
                not: 'UNAVAILABLE',
            },
        },
        data: {
            ...rest,
            address: {
                city,
                district,
                ward,
                street,
            },
            status: 'PENDING',
        },
        include: propertyInclude,
    });
};

export const updatePropertyStatus = async ({ propertyId, status, userId, isAdmin }: IUpdatePropertyStatus) => {
    return prisma.property.update({
        where: {
            propertyId,
            ...(isAdmin
                ? {}
                : {
                      owner: {
                          is: {
                              userId,
                          },
                      },
                  }),
        },
        data: {
            status,
        },
        include: propertyInclude,
    });
};

export const updatePropertiesStatus = ({ properties, status, ownerId }: IUpdatePropertiesStatus) => {
    return prisma.property.updateMany({
        where: {
            propertyId: {
                in: properties,
            },
            ...(ownerId && {
                owner: {
                    is: {
                        userId: ownerId,
                    },
                },
            }),
            ...(ownerId
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

export const getPropertiesDetailByIds = ({ ownerId, properties }: Omit<IUpdatePropertiesStatus, 'status'>) => {
    return prisma.property.findMany({
        where: {
            propertyId: {
                in: properties,
            },
            ...(ownerId && {
                owner: {
                    is: {
                        userId: ownerId,
                    },
                },
            }),
        },
        include: propertiesInclude,
    });
};

export const getPropertyInteractionEmbedById = (propertyId: IPropertyId) => {
    return prisma.property.findUnique({
        where: {
            propertyId,
        },
        select: {
            propertyId: true,
            title: true,
            description: true,
            images: true,
            price: true,
            rentalConditions: true,
            address: true,
            owner: true,
            slug: true,
            createdAt: true,
        },
    });
};

export const getPropertyInteractionEmbedBySlug = (slug: string) => {
    return prisma.property.findUnique({
        where: {
            slug,
        },
        select: {
            propertyId: true,
            title: true,
            description: true,
            images: true,
            price: true,
            rentalConditions: true,
            address: true,
            owner: true,
        },
    });
};

export const updateStatus = (propertyId: IPropertyId, status: PropertyStatus) => {
    return prisma.property.update({
        where: {
            propertyId,
        },
        data: {
            status,
        },
        include: propertyInclude,
    });
};

// TODO: Detail: lịch sử giá(theo khu vục + theo quý)
// TODO: so sánh(So sánh giá khu vực lân cận + Giá thuê phổ biến nhất: theo phường),
// TODO: bản đồ
// TODO: dành cho bạn (gợi ý)
// TODO: tin đã xem

export const updateUserInfoInProperty = ({ userId, ...rest }: Omit<UserPropertyEmbed, 'email'>) => {
    return prisma.property.updateMany({
        where: {
            owner: {
                is: {
                    userId,
                },
            },
        },
        data: {
            owner: {
                update: {
                    ...rest,
                },
            },
        },
    });
};

export const getRating = (propertyId: IPropertyId) => {
    return prisma.property.findUnique({
        where: {
            propertyId,
        },
        select: {
            rating: true,
            ratingCount: true,
        },
    });
};

export const updateRating = ({ count, propertyId, rating }: IUpdateRating) => {
    return prisma.property.update({
        where: {
            propertyId,
        },
        data: {
            rating,
            ratingCount: count,
        },
    });
};

export const countPropertiesByUser = (userId: IUserId) => {
    return prisma.property.count({
        where: {
            owner: {
                is: {
                    userId,
                },
            },
            deleted: false,
        },
    });
};

export const countUnavailablePropertiesByUser = (userId: IUserId) => {
    return prisma.property.count({
        where: {
            owner: {
                is: {
                    userId,
                },
            },
            status: 'UNAVAILABLE',
        },
    });
};
