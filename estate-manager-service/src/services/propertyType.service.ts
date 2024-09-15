import { createPropertyType, getPropertyTypes } from '../repositories/propertyType.repository';
import { PropertyTypeInput } from '../schemas/propertyType.schema';

export const createPropertyTypeService = (data: PropertyTypeInput) => {
    return createPropertyType(data);
};

export const getPropertyTypesService = () => {
    return getPropertyTypes();
};
