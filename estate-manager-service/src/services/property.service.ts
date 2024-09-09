import { PropertyStatus } from '@prisma/client';
import {
    countNotDeletedProperties,
    countNotDeletedPropertiesByOwnerId,
    createProperty,
    deletePropertyById,
    getNotDeletedProperties,
    getNotDeletedPropertiesByOwnerId,
    getNotDeletedProperty,
    getNotPendingProperties,
    getPropertiesDetailByIds,
    getPropertyBySlug,
    updatePropertiesStatus,
    updateProperty,
    updatePropertyStatus,
} from '../repositories/property.repository';
import { ResponseError } from '../types/error.type';
import CustomError from '../utils/error.util';
import prisma from '../prisma/prismaClient';
import { addRejectReason } from '../repositories/rejectReason.repository';
import {
    ICreateProperty,
    IDeleteProperty,
    IGetPropertiesWithOwnerId,
    IOwnerFilterProperties,
    IPropertyId,
    IResProperty,
    IResRepositoryProperty,
    IUpdatePropertiesStatus,
    IUpdateProperty,
    IUpdatePropertyStatus,
} from '../interface/property';
import { IPagination, IPaginationResponse } from '../interface/pagination';
import getPageInfo from '../utils/getPageInfo';
import { getAttributeByIds } from '../repositories/attribute.repository';
import { findUserById } from '../repositories/user.repository';
import slug from 'slug';
import { options } from '../utils/slug.util';
import { v4 } from 'uuid';

const convertToDTO = (property: IResRepositoryProperty): IResProperty => {
    const { attributes, ...rest } = property;

    return {
        ...rest,
        attributes: attributes.map((attr) => attr.Attribute),
    };
};

export const createPropertyService = async ({ ownerId, ...property }: ICreateProperty) => {
    const owner = await findUserById(ownerId);

    if (!owner) throw new CustomError(404, 'Owner not found');
    const { avatar, email, name, phoneNumber, userId } = owner;
    const slugProperty = slug(property.title, options) + '-' + v4();

    const res = await createProperty({
        ...property,
        owner: { avatar, email, name, phoneNumber, userId },
        slug: slugProperty,
    });

    return convertToDTO(res);
};

export const getNotPendingPropertiesService = async () => {
    const properties = await getNotPendingProperties();

    return properties.map(convertToDTO);
};

export const countNotPendingPropertiesService = async () => {
    const count = await countNotDeletedProperties();

    return count;
};

export const getNotDeletedPropertiesService = async (params: IPagination) => {
    const [properties, count] = await Promise.all([getNotDeletedProperties(params), countNotDeletedProperties()]);

    const result: IPaginationResponse<IResProperty> = {
        data: properties.map(convertToDTO),
        pageInfo: getPageInfo({
            count,
            ...params,
        }),
    };

    return result;
};

export const getNotDeletedPropertiesByOwnerIdService = async (
    params: IGetPropertiesWithOwnerId & IOwnerFilterProperties,
) => {
    const [properties, count] = await Promise.all([
        getNotDeletedPropertiesByOwnerId(params),
        countNotDeletedPropertiesByOwnerId(params.ownerId, params),
    ]);

    const result: IPaginationResponse<IResProperty> = {
        data: properties.map(convertToDTO),
        pageInfo: getPageInfo({
            count,
            ...params,
        }),
    };

    return result;
};

export const getNotDeletedPropertyService = async (property_id: IPropertyId) => {
    const property = await getNotDeletedProperty(property_id);

    if (property) return convertToDTO(property);

    throw new CustomError(404, 'Property not found');
};

export const getPropertyBySlugService = async (slug: string) => {
    const property = await getPropertyBySlug(slug);

    if (property) return convertToDTO(property);

    throw new CustomError(404, 'Property not found');
};

export const deletePropertyService = async (deleteProperty: IDeleteProperty) => {
    const res = await deletePropertyById(deleteProperty);

    if (res) {
        const response: ResponseError = {
            status: 200,
            message: `Property with id ${deleteProperty.propertyId} has been deleted`,
            success: true,
        };

        return response;
    }

    throw new CustomError(404, 'Property not found');
};

export const updatePropertyService = async (property_id: string, property: IUpdateProperty) => {
    const res = await updateProperty(property_id, property);

    if (res) return convertToDTO(res);

    throw new CustomError(404, 'Property not found');
};

export const updatePropertyStatusService = async (params: IUpdatePropertyStatus) => {
    const res = await updatePropertyStatus(params);

    if (res) return convertToDTO(res);

    throw new CustomError(404, 'Property not found');
};

export const updatePropertiesStatusService = async (params: IUpdatePropertiesStatus) => {
    try {
        const queries = [updatePropertiesStatus(params)];

        if (params.reason && params.status === 'REJECTED')
            queries.push(
                addRejectReason({
                    property_ids: params.properties,
                    reason: params.reason,
                }),
            );

        const [res] = await prisma.$transaction(queries);

        if (res.count) {
            const properties = await getPropertiesDetailByIds(params);

            return properties.map(convertToDTO);
        }

        throw new CustomError(404, 'Properties not found');
    } catch (error) {
        throw new CustomError(400, (error as any).message);
    }
};

export const getPropertyStatusService = () => {
    const res = PropertyStatus;

    return Object.keys(res);
};
