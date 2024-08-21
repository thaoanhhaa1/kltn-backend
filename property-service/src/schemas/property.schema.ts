import { z } from 'zod';

export const propertySchema = z
    .object({
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
        price: z.coerce.number().min(0, 'Price must be greater than 0').optional(),
        attributeIds: z.array(z.string()).default([]),
        images: z
            .array(z.string(), {
                required_error: 'Images are required',
            })
            .min(1, 'At least one image is required'),
        startDate: z.string().date('Format date is YYYY-MM-DD').optional(),
        latitude: z.coerce.number().optional(),
        longitude: z.coerce.number().optional(),
        deposit: z.coerce.number().min(0, 'Deposit must be greater than 0').optional(),
        min_duration: z.coerce.number().min(0, 'Min duration must be greater than 0').optional(),
        agreement_price: z.coerce.boolean().optional(),
    })
    .refine(
        (data) => {
            if (data.latitude && !data.longitude) {
                return false;
            }

            if (!data.latitude && data.longitude) {
                return false;
            }

            return true;
        },
        {
            message: 'Latitude and longitude are required',
        },
    )
    .refine((data) => {
        if (data.price && data.agreement_price) return false;
        if (!data.price && !data.agreement_price) return false;
        return true;
    });

export type PropertyInput = z.infer<typeof propertySchema>;
