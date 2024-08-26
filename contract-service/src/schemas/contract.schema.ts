// import { z } from 'zod';

// // Xác thực yêu cầu tạo hợp đồng
// export const createContractReq = z
//     .object({
//         owner_id: z.number({
//             invalid_type_error: 'Owner ID must be a number',
//             required_error: 'Owner ID is required',
//         }),
//         renter_id: z.number({
//             invalid_type_error: 'Renter ID must be a number',
//             required_error: 'Renter ID is required',
//         }),
//         property_id: z.string({
//             required_error: 'Property ID is required',
//         }),
//         blockchain_contract_address: z.string().optional(), // Để trống nếu không có địa chỉ hợp đồng từ blockchain
//         contract_terms: z.string({
//             required_error: 'Contract terms are required',
//         }),
//         start_date: z.date({
//             required_error: 'Start date is required',
//         }).refine(date => date > new Date(), {
//             message: 'Start date must be after today',
//         }),
//         end_date: z.date({
//             required_error: 'End date is required',
//         }),
//         rentalIndex: z.number({
//             required_error: 'Rental index is required',
//         }),
//         monthly_rent: z.number({
//             required_error: 'Monthly rent is required',
//         }),
//     })
//     .refine(data => data.end_date > data.start_date, {
//         message: 'End date must be after start date',
//     })
//     .refine(data => {
//         // Optional: kiểm tra nếu cần phải có địa chỉ hợp đồng khi có một số điều kiện
//         // Xóa hoặc điều chỉnh theo yêu cầu cụ thể của bạn
//         return data.blockchain_contract_address ? data.blockchain_contract_address.length > 0 : true;
//     }, {
//         message: 'Blockchain contract address is required if creating contract directly on blockchain',
//     });

// // Tạo kiểu dữ liệu từ xác thực
// export type CreateContractReq = z.infer<typeof createContractReq>;

import { z } from 'zod';

// Định nghĩa schema cho yêu cầu tạo hợp đồng
export const createContractReq = z
    .object({
        owner_address: z.string({
            invalid_type_error: 'Owner address must be a string',
            required_error: 'Owner address is required',
        }),
        renter_address: z.string({
            invalid_type_error: 'Renter address must be a string',
            required_error: 'Renter address is required',
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
        }), // Thêm trường deposit_amount
        contract_terms: z.string({
            required_error: 'Contract terms are required',
        }), // Thêm trường contract_terms
    })
    .refine(data => data.end_date > data.start_date, {
        message: 'End date must be after start date',
    })
    .refine(data => data.monthly_rent > 0, {
        message: 'Monthly rent must be greater than 0',
    });

export type CreateContractReq = z.infer<typeof createContractReq>;


