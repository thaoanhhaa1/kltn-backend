import { PropertyStatus, UserPropertyEmbed } from '@prisma/client';
import { v4 } from 'uuid';
import {
    IDeleteProperty,
    IGetNotDeletedProperties,
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
import { PropertyTypeId } from '../schemas/propertyType.schema';

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

export const getNotDeletedProperties = async ({
    skip,
    take,
    city,
    district,
    ownerId,
    ownerName,
    propertyId,
    status,
    title,
    ward,
}: IGetNotDeletedProperties): Promise<Array<IResRepositoryProperty>> => {
    return prisma.property.findMany({
        where: {
            deleted: false,
            address: {
                is: {
                    ...(city && { city }),
                    ...(district && { district }),
                    ...(ward && { ward }),
                },
            },
            owner: {
                is: {
                    ...(ownerName && {
                        name: {
                            contains: ownerName,
                            mode: 'insensitive' as const,
                        },
                    }),
                },
            },
            ...(title && {
                title: {
                    contains: title,
                    mode: 'insensitive' as const,
                },
            }),
            ...(propertyId && { propertyId }),
            ...(status && { status }),
            ...(ownerId && { owner: { is: { userId: ownerId } } }),
        },
        include: propertiesInclude,
        skip,
        take,
        orderBy: {
            createdAt: 'desc',
        },
    });
};

export const countNotDeletedProperties = async ({
    city,
    district,
    ownerId,
    ownerName,
    propertyId,
    status,
    title,
    ward,
}: IGetNotDeletedProperties) => {
    return prisma.property.count({
        where: {
            deleted: false,
            address: {
                is: {
                    ...(city && { city }),
                    ...(district && { district }),
                    ...(ward && { ward }),
                },
            },
            owner: {
                is: {
                    ...(ownerName && {
                        name: {
                            contains: ownerName,
                            mode: 'insensitive' as const,
                        },
                    }),
                },
            },
            ...(title && {
                title: {
                    contains: title,
                    mode: 'insensitive' as const,
                },
            }),
            ...(propertyId && { propertyId }),
            ...(status && { status }),
            ...(ownerId && { owner: { is: { userId: ownerId } } }),
        },
    });
};

const orderByNotDeletedPropertiesByOwnerId = (sortField?: string, sortOrder?: string): any => {
    const order = sortOrder === 'ascend' ? 'asc' : 'desc';

    switch (sortField) {
        case 'title':
            return {
                title: order,
            };
        case 'street':
            return {
                address: {
                    street: order,
                },
            };
        case 'ward':
            return {
                address: {
                    ward: order,
                },
            };
        case 'district':
            return {
                address: {
                    district: order,
                },
            };
        case 'city':
            return {
                address: {
                    city: order,
                },
            };
        case 'deposit':
            return {
                deposit: order,
            };
        case 'price':
            return {
                price: order,
            };
        case 'status':
            return {
                status: order,
            };
        case 'createdAt':
            return {
                createdAt: order,
            };
        case 'updatedAt':
            return {
                updatedAt: order,
            };
        default:
            return {
                createdAt: 'desc',
            };
    }
};

export const getNotDeletedPropertiesByOwnerId = async ({
    skip,
    take,
    ownerId,
    sortField,
    sortOrder,
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
        orderBy: orderByNotDeletedPropertiesByOwnerId(sortField, sortOrder),
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

export const getPropertyDetailsByIds = (properties: string[]) => {
    return prisma.property.findMany({
        where: {
            propertyId: {
                in: properties,
            },
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
    const { city, district, ward, street, startDate, attributeIds, conditions, ownerId, ...rest } = property;

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
            rentalConditions: conditions,
            attributes: {
                deleteMany: {},
                ...(attributeIds.length && {
                    createMany: {
                        data: attributeIds.map((attributeId) => ({
                            attributeId,
                        })),
                    },
                }),
            },
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

export const findFirstPropertyByTypeId = (typeId: PropertyTypeId) => {
    return prisma.property.findFirst({
        where: {
            type: {
                is: {
                    id: typeId,
                },
            },
        },
    });
};

export const findPropertiesByTypeId = (typeId: PropertyTypeId) => {
    return prisma.property.findMany({
        where: {
            type: {
                is: {
                    id: typeId,
                },
            },
        },
        include: propertyInclude,
    });
};

export const updatePropertyType = (typeId: PropertyTypeId, typeName: string) => {
    return prisma.property.updateMany({
        where: {
            type: {
                is: {
                    id: typeId,
                },
            },
        },
        data: {
            type: {
                set: {
                    name: typeName,
                    id: typeId,
                },
            },
        },
    });
};

// count properties by status
export const countPropertiesByStatus = () => {
    return prisma.property.groupBy({
        where: {
            deleted: false,
        },
        orderBy: {
            status: 'asc',
        },
        by: ['status'],
        _count: {
            status: true,
        },
        _avg: {
            price: true,
        },
    });
};

// count properites by type
export const countPropertiesByType = () => {
    return prisma.property.aggregateRaw({
        pipeline: [
            {
                $match: {
                    deleted: false,
                },
            },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    avgPrice: { $avg: '$price' },
                },
            },
        ],
    });
};

// count properties by city and district
export const countPropertiesByCityAndDistrict = () => {
    return prisma.property.aggregateRaw({
        pipeline: [
            {
                $match: {
                    deleted: false,
                },
            },
            {
                $group: {
                    _id: {
                        city: '$address.city',
                        district: '$address.district',
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $sort: {
                    '_id.city': 1,
                    '_id.district': 1,
                },
            },
        ],
    });
};

export const getPropertiesCbb = (userId: IUserId) => {
    return prisma.property.findMany({
        where: {
            owner: {
                is: {
                    userId,
                },
            },
            deleted: false,
            status: {
                in: ['ACTIVE', 'UNAVAILABLE'],
            },
        },
        select: {
            propertyId: true,
            title: true,
            slug: true,
            price: true,
            deposit: true,
            minDuration: true,
        },
    });
};

export const getAll = () => {
    return prisma.property.findMany({
        include: propertyInclude,
    });
};
