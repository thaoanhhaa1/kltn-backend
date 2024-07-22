import { ICreateProperty, IResProperty, IResRepositoryProperty } from '../interfaces/property';
import { createProperty, getAllProperties, getPropertyBySlug } from '../repositories/property.repository';
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
