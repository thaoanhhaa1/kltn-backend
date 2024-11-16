import { PropertyStatus } from '@prisma/client';
import slug from 'slug';
import { v4 } from 'uuid';
import { IPagination, IPaginationResponse } from '../interface/pagination';
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
import { IUserId } from '../interface/user';
import prisma from '../prisma/prismaClient';
import {
    countNotDeletedProperties,
    countNotDeletedPropertiesByOwnerId,
    createProperty,
    deletePropertyById,
    findPropertiesByTypeId,
    getNotDeletedProperties,
    getNotDeletedPropertiesByOwnerId,
    getNotDeletedProperty,
    getNotPendingProperties,
    getPropertiesCbb,
    getPropertiesDetailByIds,
    getPropertyBySlug,
    updatePropertiesStatus,
    updateProperty,
    updatePropertyStatus,
    updatePropertyType,
} from '../repositories/property.repository';
import { softDeleteByPropertyId, softDeleteByPropertyIds } from '../repositories/propertyInteraction.repository';
import { addRejectReason } from '../repositories/rejectReason.repository';
import { findUserById } from '../repositories/user.repository';
import { PropertyTypeId } from '../schemas/propertyType.schema';
import { ResponseError } from '../types/error.type';
import CustomError from '../utils/error.util';
import getPageInfo from '../utils/getPageInfo';
import { options } from '../utils/slug.util';

const convertToDTO = (property: IResRepositoryProperty): IResProperty => {
    const { attributes, ...rest } = property;

    return {
        ...rest,
        attributes: attributes.map((attr) => attr.Attribute),
    };
};

export const createPropertyService = async ({ ownerId, ...property }: ICreateProperty) => {
    const owner = await findUserById(ownerId);

    if (!owner) throw new CustomError(404, 'Không tìm thấy chủ sở hữu');
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

    throw new CustomError(404, 'Không tìm thấy bất động sản');
};

export const getPropertyBySlugService = async (slug: string) => {
    const property = await getPropertyBySlug(slug);

    if (property) return convertToDTO(property);

    throw new CustomError(404, 'Không tìm thấy bất động sản');
};

export const deletePropertyService = async (deleteProperty: IDeleteProperty) => {
    const res = await deletePropertyById(deleteProperty);

    if (res) {
        const response: ResponseError = {
            status: 200,
            message: `Bất động sản ${deleteProperty.propertyId} đã bị xóa`,
            success: true,
        };

        softDeleteByPropertyId(deleteProperty.propertyId).then(() =>
            console.log('Đã xóa các tương tác của bất động sản'),
        );

        return response;
    }

    throw new CustomError(404, 'Không tìm thấy bất động sản');
};

export const updatePropertyService = async (propertyId: string, property: IUpdateProperty) => {
    const res = await updateProperty(propertyId, property);

    if (!res) throw new CustomError(404, 'Không tìm thấy bất động sản hoặc bất động sản đang cho thuê');

    softDeleteByPropertyId(propertyId).then(() => console.log('Đã xóa các tương tác của bất động sản'));

    return convertToDTO(res);
};

export const updatePropertyStatusService = async (params: IUpdatePropertyStatus) => {
    const res = await updatePropertyStatus(params);

    if (res) return convertToDTO(res);

    throw new CustomError(404, 'Không tìm thấy bất động sản');
};

export const updatePropertiesStatusService = async (params: IUpdatePropertiesStatus) => {
    try {
        const queries = [updatePropertiesStatus(params)];

        if (params.reason && params.status === 'REJECTED')
            queries.push(
                addRejectReason({
                    propertyIds: params.properties,
                    reason: params.reason,
                }),
            );

        const [res] = await prisma.$transaction(queries);

        if (['INACTIVE', 'REJECTED'].includes(params.status))
            softDeleteByPropertyIds(params.properties).then(() => console.log('Đã xóa các tương tác của bất động sản'));

        if (res.count) {
            const properties = await getPropertiesDetailByIds(params);

            return properties.map(convertToDTO);
        }

        throw new CustomError(404, 'Không tìm thấy bất động sản');
    } catch (error) {
        throw new CustomError(400, (error as any).message);
    }
};

export const getPropertyStatusService = () => {
    const res = PropertyStatus;

    return Object.keys(res);
};

export const getPropertyDetailsByIdsService = async (propertyIds: string[]) => {
    const properties = await getPropertiesDetailByIds({ properties: propertyIds });

    return properties.map(convertToDTO);
};

export const findPropertiesByTypeIdService = (typeId: string) => {
    return findPropertiesByTypeId(typeId);
};

export const updatePropertyTypeInPropertiesService = async (typeId: PropertyTypeId, typeName: string) => {
    const res = await updatePropertyType(typeId, typeName);

    return res;
};

export const getPropertiesCbbService = (userId: IUserId) => {
    return getPropertiesCbb(userId);
};

export const getAllService = async () => {
    const properties = await getNotPendingProperties();

    return properties.map(convertToDTO);
};
