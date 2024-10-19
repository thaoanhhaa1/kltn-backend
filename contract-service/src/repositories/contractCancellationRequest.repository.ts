import { ContractCancellationRequestStatus } from '@prisma/client';
import { IContractId } from '../interfaces/contract';
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
            updatedAt: {
                lte: yesterday,
            },
        },
    });
};

export const getRequestsCancelContract = () => {
    return prisma.contractCancellationRequest.findMany({
        where: {
            cancelDate: {
                gte: new Date(new Date().setDate(new Date().getSeconds() - 30)),
                lt: new Date(new Date().setDate(new Date().getDate() + 1)),
            },
            deleted: false,
            status: {
                in: ['UNILATERAL_CANCELLATION', 'APPROVED'],
            },
            contract: {
                status: {
                    in: ['UNILATERAL_CANCELLATION', 'APPROVED_CANCELLATION'],
                },
            },
        },
        select: {
            contractId: true,
            id: true,
        },
    });
};

export const getHandledCancelRequestByContractId = (contractId: IContractId) => {
    return prisma.contractCancellationRequest.findMany({
        where: {
            contractId,
            deleted: false,
            status: {
                in: ['APPROVED', 'CONTINUE', 'CANCELLED', 'UNILATERAL_CANCELLATION'],
            },
        },
        include: {
            userRequest: {
                select: {
                    avatar: true,
                    name: true,
                    email: true,
                    userId: true,
                },
            },
        },
        orderBy: {
            requestedAt: 'desc',
        },
    });
};

export const getNotHandledCancelRequestByContractId = (contractId: IContractId) => {
    return prisma.contractCancellationRequest.findFirst({
        where: {
            contractId,
            deleted: false,
            status: {
                in: ['PENDING', 'REJECTED'],
            },
        },
        include: {
            userRequest: {
                select: {
                    avatar: true,
                    name: true,
                    email: true,
                    userId: true,
                },
            },
        },
        orderBy: {
            requestedAt: 'desc',
        },
    });
};

export const cancelRequestWhenEndContract = (contractId: IContractId) => {
    return prisma.contractCancellationRequest.updateMany({
        where: {
            contractId,
            status: {
                in: ['PENDING', 'REJECTED'],
            },
        },
        data: {
            status: 'CANCELLED',
        },
    });
};
