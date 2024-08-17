import { IPagination, IPaginationResponse } from '../interfaces/pagination';
import {
    ICreateProperty,
    IDeleteProperty,
    IPropertyId,
    IPropertyStatus,
    IResProperty,
    IResRepositoryProperty,
    IUpdateProperty,
    IUpdatePropertyStatus,
} from '../interfaces/property';
import {
    countNotDeletedProperties,
    createProperty,
    deletePropertyById,
    getNotDeletedProperties,
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

export const updatePropertiesStatusService = async (propertyIds: IPropertyId[], status: IPropertyStatus) => {
    const res = await updatePropertiesStatus(propertyIds, status);

    if (res.count) {
        const properties = await getPropertiesDetailByIds(propertyIds);

        return properties.map(convertToDTO);
    }

    throw new CustomError(404, 'Properties not found');
};
