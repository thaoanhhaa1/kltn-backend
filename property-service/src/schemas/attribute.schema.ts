import { z } from 'zod';

export const attributeSchema = z.object({
    attribute_type: z.enum(['Amenity', 'Highlight', 'Facility'], {
        message: 'Attribute type must be one of Amenity, Highlight, Facility',
        required_error: 'Attribute type is required',
    }),
    attribute_name: z.string({
        required_error: 'Attribute name is required',
    }),
});

export type Attribute = z.infer<typeof attributeSchema>;
