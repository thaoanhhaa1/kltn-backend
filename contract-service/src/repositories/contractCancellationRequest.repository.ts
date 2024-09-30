import prisma from '../prisma/prismaClient';
import { CreateContractCancellationRequest } from '../schemas/contractCancellationRequest.schema';

export const createCancellationRequest = (data: CreateContractCancellationRequest) => {
    return prisma.contractCancellationRequest.create({
        data,
    });
};

export const getCancelRequestByContractId = (contractId: string) => {
    return prisma.contractCancellationRequest.findFirst({
        where: {
            contractId,
            deleted: false,
            status: {
                in: ['PENDING', 'APPROVED', 'REJECTED', 'UNILATERAL_CANCELLATION'],
            },
        },
    });
};
