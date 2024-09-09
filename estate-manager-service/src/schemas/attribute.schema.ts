import { z } from 'zod';

export const attributeSchema = z.object({
    type: z.enum(['Amenity', 'Highlight', 'Facility'], {
        message: 'Attribute type must be one of Amenity, Highlight, Facility',
        required_error: 'Attribute type is required',
    }),
    name: z.string({
        required_error: 'Attribute name is required',
    }),
});

export type Attribute = z.infer<typeof attributeSchema>;

export type ICreateAttributeReq = Omit<Attribute, 'attributeId' | 'createdAt' | 'updatedAt' | 'deleted'>;

export type IUpdateAttributeReq = Partial<Omit<Attribute, 'attributeId' | 'createdAt' | 'updatedAt'>>;
