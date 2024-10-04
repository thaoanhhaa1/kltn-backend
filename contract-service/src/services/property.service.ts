import { IProperty } from '../interfaces/property';
import { createProperty, softDeleteProperty, updateProperty } from '../repositories/property.repository';

export const createPropertyService = (property: IProperty) => {
    return createProperty(property);
};

export const softDeletePropertyService = (propertyId: string) => {
    return softDeleteProperty(propertyId);
};

export const updatePropertyService = (propertyId: string, property: Omit<IProperty, 'propertyId'>) => {
    return updateProperty(propertyId, property);
};
