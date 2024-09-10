import { z } from 'zod';

export const createRentalRequestSchema = z
    .object({
        ownerId: z.string({
            required_error: 'Owner ID là bắt buộc',
        }),
        renterId: z.string({
            required_error: 'Renter ID là bắt buộc',
        }),
        property: z.object({
            propertyId: z.string({
                required_error: 'Property ID là bắt buộc',
            }),
            title: z.string({
                required_error: 'Tiêu đề là bắt buộc',
            }),
            images: z.array(
                z.string({
                    required_error: 'Ảnh là bắt buộc',
                }),
            ),
            slug: z.string().min(1, { message: 'Slug là bắt buộc' }),
        }),
        rentalPrice: z.coerce.number({
            required_error: 'Giá thuê là bắt buộc',
        }),
        rentalDeposit: z.coerce.number({
            required_error: 'Tiền đặt cọc là bắt buộc',
        }),
        rentalStartDate: z
            .string({
                required_error: 'Ngày bắt đầu là bắt buộc',
            })
            .regex(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'Định dạng ngày là DD/MM/YYYY' })
            .refine((date) => {
                const currentDate = new Date();
                const startDate = new Date(date);
                return startDate >= currentDate;
            }),
        rentalEndDate: z
            .string({
                required_error: 'Ngày kết thúc là bắt buộc',
            })
            .regex(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'Định dạng ngày là DD/MM/YYYY' })
            .refine((date) => {
                const currentDate = new Date();
                const endDate = new Date(date);
                return endDate >= currentDate;
            }),
    })
    .refine((data) => {
        return new Date(data.rentalStartDate) < new Date(data.rentalEndDate);
    });

export type ICreateRentalRequest = z.infer<typeof createRentalRequestSchema>;
