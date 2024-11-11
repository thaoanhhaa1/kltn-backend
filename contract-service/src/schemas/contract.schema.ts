import { z } from 'zod';

// Định nghĩa schema cho yêu cầu tạo hợp đồng
export const createContractReq = z
    .object({
        ownerId: z.string({
            required_error: 'Owner User ID is required',
        }),
        renterId: z.string({
            required_error: 'Renter User ID is required',
        }),
        propertyId: z.string({
            required_error: 'Property ID is required',
        }),
        startDate: z
            .string({
                required_error: 'Start date is required',
            })
            .transform((dateStr) => new Date(dateStr)), // Chuyển đổi chuỗi thành Date
        endDate: z
            .string({
                required_error: 'End date is required',
            })
            .transform((dateStr) => new Date(dateStr)),
        monthlyRent: z.number({
            required_error: 'Monthly rent is required',
        }),
        depositAmount: z.number({
            required_error: 'Deposit amount is required',
        }),
        contractTerms: z.string({
            required_error: 'Contract terms are required',
        }),
    })
    .refine((data) => data.endDate > data.startDate, {
        message: 'End date must be after start date',
    })
    .refine((data) => data.monthlyRent > 0, {
        message: 'Monthly rent must be greater than 0',
    });

export type CreateContractReq = z.infer<typeof createContractReq>;

export const generateContractSchema = z.object({
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
        .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Định dạng ngày là YYYY-MM-DD' })
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
        .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Định dạng ngày là DD/MM/YYYY' })
        .refine((date) => {
            const currentDate = new Date();
            const endDate = new Date(date);
            return {
                message: 'Ngày kết thu phải lớn hơn ngày bắt đầu',
                success: endDate > currentDate,
            };
        }),
});

export type GenerateContractReq = z.infer<typeof generateContractSchema>;
