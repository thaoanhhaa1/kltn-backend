import { z } from 'zod';

export const createContractExtensionRequestSchema = z.object({
    contractId: z.string({
        required_error: 'Mã hợp đồng là bắt buộc',
    }),
    transactionId: z.coerce.number().optional(),
    type: z.enum(['EXTEND_CONTRACT', 'EXTEND_PAYMENT'], {
        required_error: 'Loại yêu cầu phải là gia hạn hợp đồng hoặc gia hạn thanh toán',
    }),
    extensionDate: z
        .string({
            required_error: 'Ngày gia hạn là bắt buộc',
        })
        .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Định dạng ngày là YYYY-MM-DD' }),
    reason: z.string().optional(),
    userId: z.string({
        required_error: 'Mã người dùng là bắt buộc',
    }),
});

export type ICreateContractExtensionRequest = z.infer<typeof createContractExtensionRequestSchema>;

export const updateContractExtensionRequestStatusSchema = z.object({
    id: z.coerce.number({
        required_error: 'Mã yêu cầu gia hạn là bắt buộc',
    }),
    status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED'], {
        required_error: 'Trạng thái yêu cầu phải là đã duyệt, từ chối hoặc hủy bỏ',
    }),
    userId: z.string({
        required_error: 'Mã người dùng là bắt buộc',
    }),
    contractId: z.string({
        required_error: 'Mã hợp đồng là bắt buộc',
    }),
});

export type IUpdateContractExtensionRequestStatus = z.infer<typeof updateContractExtensionRequestStatusSchema>;
