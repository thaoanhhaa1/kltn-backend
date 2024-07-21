import { ICreateProperty, IResProperty, IResRepositoryProperty } from '../interfaces/property';
import { createProperty, getAllProperties } from '../repositories/property.repository';

const convertToDTO = (property: IResRepositoryProperty): IResProperty => {
    const { PropertyAttributes, PropertyImages, RentalConditions, RentalPrices, Address, ...rest } = property;

    return {
        ...rest,
        address: Address,
        attributes: PropertyAttributes.map((attr) => attr.Attribute),
        images: PropertyImages.map((image) => image.image_url),
        conditions: RentalConditions,
        prices: RentalPrices[0].rental_price,
    };
};

export const createPropertyService = async (property: ICreateProperty) => {
    const res = await createProperty(property);

    return convertToDTO(res);
};

export const getAllPropertiesService = async () => {
    return getAllProperties();
};
