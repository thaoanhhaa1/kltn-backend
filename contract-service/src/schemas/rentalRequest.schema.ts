import { z } from 'zod';

export const createRentalRequestSchema = z
    .object({
        ownerId: z.string({
            required_error: 'Owner ID là bắt buộc',
        }),
        renterId: z.string({
            required_error: 'Renter ID là bắt buộc',
        }),
        propertyId: z.string({
            required_error: 'Property ID là bắt buộc',
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
                return {
                    message: 'Ngày bắt đầu phải lớn hơn hoặc bằng ngày hiện tại',
                    success: startDate >= currentDate,
                };
            }),
        rentalEndDate: z
            .string({
                required_error: 'Ngày kết thúc là bắt buộc',
            })
            .regex(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'Định dạng ngày là DD/MM/YYYY' })
            .refine((date) => {
                const currentDate = new Date();
                const endDate = new Date(date);
                return {
                    message: 'Ngày kết thu phải lớn hơn ngày bắt đầu',
                    success: endDate > currentDate,
                };
            }),
    })
    .refine((data) => {
        return {
            message: 'Ngày kết thúc phải lớn hơn ngày bắt đầu',
            success: new Date(data.rentalEndDate) > new Date(data.rentalStartDate),
        };
    });

export type ICreateRentalRequest = z.infer<typeof createRentalRequestSchema>;
