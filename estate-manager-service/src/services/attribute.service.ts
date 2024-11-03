import {
    createAttribute,
    getAllAttributes,
    getAllAttributesCbb,
    getAttributeById,
    softDeleteAttribute,
    updateAttribute,
} from '../repositories/attribute.repository';
import { countAttributes } from '../repositories/propertyAttribute.repository';
import { ICreateAttributeReq, IUpdateAttributeReq } from '../schemas/attribute.schema';
import CustomError from '../utils/error.util';

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
    const count = await countAttributes(id);

    if (count > 0) throw new CustomError(400, 'Không thể xóa thuộc tính này vì có bất động sản đang sử dụng');

    return softDeleteAttribute(id);
};
