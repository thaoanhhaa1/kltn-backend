import { PropertyStatus } from '@prisma/client';
import { IPagination, IPaginationResponse } from '../interfaces/pagination';
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
} from '../interfaces/property';
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
import getPageInfo from '../utils/getPageInfo';
import prisma from '../prisma/prismaClient';
import { addRejectReason } from '../repositories/rejectReason.repository';

const convertToDTO = (property: IResRepositoryProperty): IResProperty => {
    const { PropertyAttributes, PropertyImages, RentalConditions, RentalPrices, Address, Owner, ...rest } = property;

    return {
        ...rest,
        address: Address,
        attributes: PropertyAttributes.map((attr) => attr.Attribute),
        images: PropertyImages.map((image) => image.image_url),
        conditions: RentalConditions,
        prices: RentalPrices[0].rental_price,
        owner: Owner,
    };
};

export const createPropertyService = async (property: ICreateProperty) => {
    const res = await createProperty(property);

    return convertToDTO(res);
};

export const getNotPendingPropertiesService = async () => {
    const properties = await getNotPendingProperties();

    return properties.map(convertToDTO);
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
            message: `Property with id ${deleteProperty.property_id} has been deleted`,
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
