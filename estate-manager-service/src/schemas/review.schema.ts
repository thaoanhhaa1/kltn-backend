import { z } from 'zod';

export const createReviewSchema = z.object({
    content: z.string().optional(),
    rating: z.coerce.number().min(1, 'Đánh giá phải lớn hơn 0').max(10, 'Đánh giá phải nhỏ hơn hoặc bằng 10'),
    medias: z.array(z.string()).default([]),
    parentId: z.string().optional(),
    propertyId: z.string({
        required_error: 'Bất động sản không được để trống',
    }),
    contractId: z.string({
        required_error: 'Hợp đồng không được để trống',
    }),
});

export type CreateReviewRequest = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({
    content: z.string({
        required_error: 'Nội dung không được để trống',
    }),
    rating: z.coerce.number().min(1, 'Đánh giá phải lớn hơn 0').max(10, 'Đánh giá phải nhỏ hơn hoặc bằng 10'),
    medias: z.array(z.string()).default([]),
});

export type UpdateReviewRequest = z.infer<typeof updateReviewSchema>;
