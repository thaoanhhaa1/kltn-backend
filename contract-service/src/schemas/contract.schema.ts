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
