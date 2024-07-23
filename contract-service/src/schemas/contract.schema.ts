import { z } from 'zod';

export const createContractReq = z
    .object({
        owner_id: z.coerce.number({
            invalid_type_error: 'Owner ID must be a number',
            required_error: 'Owner ID is required',
        }),
        renter_id: z.coerce.number({
            invalid_type_error: 'Renter ID must be a number',
            required_error: 'Renter ID is required',
        }),
        property_id: z.string({
            required_error: 'Property ID is required',
        }),
        blockchain_contract_address: z.string({
            required_error: 'Blockchain contract address is required',
        }),
        contract_terms: z.string({
            required_error: 'Contract terms is required',
        }),
        start_date: z
            .date({
                required_error: 'Start date is required',
            })
            .refine((date) => date > new Date(), {
                message: 'Start date must be after today',
            }),
        end_date: z.coerce.date({
            required_error: 'End date is required',
        }),
    })
    .refine((data) => data.end_date > data.start_date, {
        message: 'End date must be after start date',
    });

export type CreateContractReq = z.infer<typeof createContractReq>;
