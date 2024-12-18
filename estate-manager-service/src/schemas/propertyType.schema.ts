import { PropertyType } from '@prisma/client';
import { z } from 'zod';
import { nameOfUserSchema } from './validation.schema';

export type PropertyTypeId = Pick<PropertyType, 'id'>['id'];

export const propertyTypeSchema = z.object({
    name: nameOfUserSchema,
});

export type PropertyTypeInput = z.infer<typeof propertyTypeSchema>;

export type IPropertyTypeDTO = Pick<PropertyType, 'id' | 'name'>;

export interface IGetPropertyTypeDetails {
    id?: PropertyTypeId;
    name?: string;
}
