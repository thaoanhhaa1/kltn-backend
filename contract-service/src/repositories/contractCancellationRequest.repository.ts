import { ContractCancellationRequestStatus } from '@prisma/client';
import { ContractCancellationRequestId } from '../interfaces/contractCancellationRequest';
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

export const getCancelRequestById = (requestId: ContractCancellationRequestId) => {
    return prisma.contractCancellationRequest.findFirst({
        where: {
            id: requestId,
            deleted: false,
        },
    });
};

export const updateCancelRequestStatus = (requestId: number, status: ContractCancellationRequestStatus) => {
    return prisma.contractCancellationRequest.update({
        where: {
            id: requestId,
        },
        data: {
            status,
        },
    });
};

export const getCancelRequestOverdue = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return prisma.contractCancellationRequest.findMany({
        where: {
            status: {
                in: ['PENDING', 'REJECTED'],
            },
            deleted: false,
            requestedAt: {
                lte: yesterday,
            },
        },
    });
};
