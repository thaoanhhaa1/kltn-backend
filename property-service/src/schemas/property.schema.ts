import { z } from 'zod';

export const propertySchema = z.object({
    title: z.string({
        required_error: 'Title is required',
    }),
    description: z.string({
        required_error: 'Description is required',
    }),
    address: z.object({
        city: z.string({
            required_error: 'City is required',
        }),
        state: z.string({
            required_error: 'State is required',
        }),
        country: z.string({
            required_error: 'Country is required',
        }),
        street: z.string({
            required_error: 'Street is required',
        }),
        zipCode: z.string(),
    }),
    conditions: z.array(
        z.object({
            type: z.string({
                required_error: 'Condition type is required',
            }),
            value: z.string({
                required_error: 'Condition value is required',
            }),
        }),
    ),
    price: z
        .number({
            required_error: 'Price is required',
        })
        .min(0, 'Price must be greater than 0'),
    attributeIds: z.array(z.string()),
});

export type PropertyInput = z.infer<typeof propertySchema>;
