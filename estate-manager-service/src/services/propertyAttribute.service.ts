import { getPropertyIdByAttributeId } from '../repositories/propertyAttribute.repository';

export const getPropertyIdByAttributeIdService = (attributeId: string) => {
    return getPropertyIdByAttributeId(attributeId);
};
