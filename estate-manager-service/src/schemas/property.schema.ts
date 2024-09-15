import { Property } from '@prisma/client';
import { z } from 'zod';

export const propertySchema = z
    .object({
        title: z.string({
            required_error: 'Tiêu đề không được để trống',
        }),
        description: z.string({
            required_error: 'Mô tả không được để trống',
        }),
        city: z.string({
            required_error: 'Tỉnh/Thành phố không được để trống',
        }),
        district: z.string({
            required_error: 'Quận/Huyện không được để trống',
        }),
        ward: z.string({
            required_error: 'Phường/Xã không được để trống',
        }),
        street: z.string({
            required_error: 'Địa chỉ không được để trống',
        }),
        conditions: z
            .array(
                z.object({
                    type: z.string({
                        required_error: 'Loại điều kiện không được để trống',
                    }),
                    value: z.string({
                        required_error: 'Giá trị điều kiện không được để trống',
                    }),
                }),
            )
            .default([]),
        price: z.coerce.number().min(0, 'Giá phải lớn hơn 0').optional(),
        attributeIds: z.array(z.string()).default([]),
        images: z
            .array(z.string(), {
                required_error: 'Ít nhất một ảnh là bắt buộc',
            })
            .min(1, 'Ít nhất một ảnh là bắt buộc'),
        startDate: z.string().date('Định dạng ngày phải là YYYY-MM-DD').optional(),
        latitude: z.coerce.number().optional(),
        longitude: z.coerce.number().optional(),
        deposit: z.coerce.number().min(0, 'Tiền cọc phải lớn hơn 0').optional(),
        minDuration: z.coerce.number().min(0, 'Thời gian thuê tối thiểu phải lớn hơn 0').optional(),
        agreementPrice: z.coerce.boolean().optional(),
        type: z.object({
            id: z.string({
                required_error: 'Loại bất động sản không được để trống',
            }),
            name: z.string({
                required_error: 'Loại bất động sản không được để trống',
            }),
        }),
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
            message: 'Latitude và longitude là bắt buộc',
        },
    )
    .refine((data) => {
        if (data.price && data.agreementPrice) return false;
        if (!data.price && !data.agreementPrice) return false;
        return true;
    });

export type PropertyInput = z.infer<typeof propertySchema>;

export type ICreatePropertyReq = Omit<PropertyInput, 'propertyId' | 'createdAt' | 'updatedAt' | 'deleted'> & {
    attributeIds: string[];
    owner: Property['owner'];
    slug: string;
};
