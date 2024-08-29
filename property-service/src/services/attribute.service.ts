import { Attribute } from '@prisma/client';
import {
    createAttribute,
    getAllAttributes,
    getAllAttributesCbb,
    getAttributeById,
    softDeleteAttribute,
    updateAttribute,
} from '../repositories/attribute.repository';

export const createAttributeService = async (
    attribute: Omit<Attribute, 'attribute_id' | 'created_at' | 'updated_at' | 'deleted'>,
) => {
    return createAttribute(attribute);
};

export const getAllAttributesService = async () => {
    return getAllAttributes();
};

export const getAllAttributesCbbService = async () => {
    return getAllAttributesCbb();
};

export const getAttributeByIdService = async (id: string) => {
    return getAttributeById(id);
};

export const updateAttributeService = async (
    id: string,
    data: Partial<Omit<Attribute, 'attribute_id' | 'created_at' | 'updated_at'>>,
) => {
    return updateAttribute(id, data);
};

export const deleteAttributeService = async (id: string) => {
    return softDeleteAttribute(id);
};
