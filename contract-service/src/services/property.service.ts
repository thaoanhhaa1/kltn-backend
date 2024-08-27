import { Property } from '@prisma/client';
import { createProperty, softDeleteProperty, updateProperty } from '../repositories/property.repository';

export const createPropertyService = (property: Property) => {
    return createProperty(property);
};

export const softDeletePropertyService = (property_id: string) => {
    return softDeleteProperty(property_id);
};

export const updatePropertyService = (property_id: string, property: Omit<Property, 'property_id'>) => {
    return updateProperty(property_id, property);
};
