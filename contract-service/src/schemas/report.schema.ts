import { z } from 'zod';
import {
    compensationOptional,
    contractIdValidation,
    descriptionValidation,
    listStringOptional,
    ownerIdValidation,
    proposedValidation,
    renterIdValidation,
    reportChildIdValidation,
    reportIdValidation,
    reportPriorityValidation,
    reportTypeValidation,
    resolvedAtValidation,
    titleValidation,
    userIdValidation,
} from './validation.schema';

export const createReportForRenterSchema = z.object({
    renterId: renterIdValidation,
    contractId: contractIdValidation,
    type: reportTypeValidation,
    priority: reportPriorityValidation,
    title: titleValidation,
    description: descriptionValidation,
    proposed: proposedValidation,
    evidences: listStringOptional,
    compensation: compensationOptional,
    resolvedAt: resolvedAtValidation,
});

export type CreateReportForRenterRequest = z.infer<typeof createReportForRenterSchema>;

export const createReportChildSchema = z.object({
    ownerId: ownerIdValidation,
    reportId: reportIdValidation,
    proposed: proposedValidation,
    compensation: compensationOptional,
    evidences: listStringOptional,
    resolvedAt: resolvedAtValidation,
});

export type CreateReportChildRequest = z.infer<typeof createReportChildSchema>;

export const acceptReportByOwnerSchema = z.object({
    reportId: reportIdValidation,
    reportChildId: reportChildIdValidation,
    userId: userIdValidation,
});

export type AcceptReportByOwnerRequest = z.infer<typeof acceptReportByOwnerSchema>;

export const proposedReportChildByOwnerSchema = z.object({
    reportId: reportIdValidation,
    ownerId: ownerIdValidation,
    proposed: proposedValidation,
    compensation: compensationOptional,
    evidences: listStringOptional,
    resolvedAt: resolvedAtValidation,
});

export type ProposedReportChildByOwnerRequest = z.infer<typeof proposedReportChildByOwnerSchema>;

export const resolveReportByAdminSchema = z.object({
    choose: z.enum(['admin', 'renter', 'owner'], {
        required_error: 'Chọn hành động là bắt buộc',
    }),
    reportId: reportIdValidation,
    proposed: z.string().optional(),
    compensation: compensationOptional,
    evidences: listStringOptional,
    resolvedAt: resolvedAtValidation.optional(),
});

export type ResolveReportByAdminRequest = z.infer<typeof resolveReportByAdminSchema>;
