import { z } from 'zod';

export const attributeSchema = z.object({
    type: z.enum(['Amenity', 'Highlight', 'Facility'], {
        message: "Loại thuộc tính phải là 'Tiện ích', 'Nổi bật' hoặc 'Tiện nghi'",
        required_error: 'Loại thuộc tính là bắt buộc',
    }),
    name: z.string({
        required_error: 'Tên thuộc tính là bắt buộc',
    }),
});

export type Attribute = z.infer<typeof attributeSchema>;

export type ICreateAttributeReq = Omit<Attribute, 'attributeId' | 'createdAt' | 'updatedAt' | 'deleted'>;

export type IUpdateAttributeReq = Partial<Omit<Attribute, 'attributeId' | 'createdAt' | 'updatedAt'>>;

export interface IGetAllAttributes {
    id?: string;
    type?: string;
    name?: string;
}
