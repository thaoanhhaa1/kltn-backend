import { z } from 'zod';
import { dateValidation } from './validation.schema';

export const createContractCancellationRequestSchema = z.object({
    contractId: z.string({
        required_error: 'Mã hợp đồng không được để trống',
    }),
    requestedBy: z.string({
        required_error: 'Người yêu cầu không được để trống',
    }),
    cancelDate: dateValidation,
    reason: z.string().optional(),
});

export type CreateContractCancellationRequest = z.infer<typeof createContractCancellationRequestSchema>;
