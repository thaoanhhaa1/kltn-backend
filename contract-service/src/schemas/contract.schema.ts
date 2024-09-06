import { z } from 'zod';

// Định nghĩa schema cho yêu cầu tạo hợp đồng
export const createContractReq = z
    .object({
        owner_user_id: z.number({
            required_error: 'Owner User ID is required',
        }),
        renter_user_id: z.number({
            required_error: 'Renter User ID is required',
        }),
        property_id: z.string({
            required_error: 'Property ID is required',
        }),
        start_date: z.string({
            required_error: 'Start date is required',
        }).transform(dateStr => new Date(dateStr)), // Chuyển đổi chuỗi thành Date
        end_date: z.string({
            required_error: 'End date is required',
        }).transform(dateStr => new Date(dateStr)),
        monthly_rent: z.number({
            required_error: 'Monthly rent is required',
        }),
        deposit_amount: z.number({
            required_error: 'Deposit amount is required',
        }),
        contract_terms: z.string({
            required_error: 'Contract terms are required',
        }),
    })
    .refine(data => data.end_date > data.start_date, {
        message: 'End date must be after start date',
    })
    .refine(data => data.monthly_rent > 0, {
        message: 'Monthly rent must be greater than 0',
    });

export type CreateContractReq = z.infer<typeof createContractReq>;
