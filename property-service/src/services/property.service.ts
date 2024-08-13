import {
    ICreateProperty,
    IDeleteProperty,
    IResProperty,
    IResRepositoryProperty,
    IUpdateProperty,
} from '../interfaces/property';
import {
    createProperty,
    deletePropertyById,
    getAllProperties,
    getPropertyBySlug,
    updateProperty,
} from '../repositories/property.repository';
import { ResponseError } from '../types/error.type';
import CustomError from '../utils/error.util';

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

export const getAllPropertiesService = async () => {
    const properties = await getAllProperties();

    return properties.map(convertToDTO);
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
