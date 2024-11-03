import { findFirstPropertyByTypeId } from '../repositories/property.repository';
import {
    createPropertyType,
    getPropertyTypeDetails,
    getPropertyTypes,
    softDeletePropertyType,
    updatePropertyType,
} from '../repositories/propertyType.repository';
import { PropertyTypeId, PropertyTypeInput } from '../schemas/propertyType.schema';
import CustomError from '../utils/error.util';

export const createPropertyTypeService = (data: PropertyTypeInput) => {
    return createPropertyType(data);
};

export const getPropertyTypesService = () => {
    return getPropertyTypes();
};

export const getPropertyTypeDetailsService = () => {
    return getPropertyTypeDetails();
};

export const updatePropertyTypeService = (id: PropertyTypeId, data: PropertyTypeInput) => {
    return updatePropertyType(id, data);
};

export const softDeletePropertyTypeService = async (id: PropertyTypeId) => {
    const property = await findFirstPropertyByTypeId(id);

    if (property) throw new CustomError(400, 'Không thể xóa loại bất động sản này vì có bất động sản đang sử dụng');

    return softDeletePropertyType(id);
};
