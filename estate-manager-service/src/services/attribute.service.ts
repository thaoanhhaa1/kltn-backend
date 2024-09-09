import {
    createAttribute,
    getAllAttributes,
    getAllAttributesCbb,
    getAttributeById,
    softDeleteAttribute,
    updateAttribute,
} from '../repositories/attribute.repository';
import { ICreateAttributeReq, IUpdateAttributeReq } from '../schemas/attribute.schema';

export const createAttributeService = async (attribute: ICreateAttributeReq) => {
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

export const updateAttributeService = async (id: string, data: IUpdateAttributeReq) => {
    return updateAttribute(id, data);
};

export const deleteAttributeService = async (id: string) => {
    return softDeleteAttribute(id);
};
