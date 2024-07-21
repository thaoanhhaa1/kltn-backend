import { z } from 'zod';

export const propertySchema = z.object({
    title: z.string({
        required_error: 'Title is required',
    }),
    description: z.string({
        required_error: 'Description is required',
    }),
    city: z.string({
        required_error: 'City is required',
    }),
    district: z.string({
        required_error: 'District is required',
    }),
    ward: z.string({
        required_error: 'Ward is required',
    }),
    street: z.string({
        required_error: 'Street is required',
    }),
    conditions: z
        .array(
            z.object({
                type: z.string({
                    required_error: 'Condition type is required',
                }),
                value: z.string({
                    required_error: 'Condition value is required',
                }),
            }),
        )
        .default([]),
    price: z.coerce
        .number({
            required_error: 'Price is required',
        })
        .min(0, 'Price must be greater than 0'),
    attributeIds: z.array(z.string()).default([]),
    images: z
        .array(z.string(), {
            required_error: 'Images are required',
        })
        .min(1, 'At least one image is required'),
    startDate: z.string().date('Format date is YYYY-MM-DD').optional(),
});

export type PropertyInput = z.infer<typeof propertySchema>;
