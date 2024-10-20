import { ContractExtensionRequestStatus } from '@prisma/client';
import prisma from '../prisma/prismaClient';
import { CreateContractExtensionRequest, ExtensionRequestId } from './../interfaces/contractExtensionRequest.interface';

export const createContractExtensionRequest = (data: CreateContractExtensionRequest) => {
    return prisma.contractExtensionRequest.create({
        data,
    });
};

export const updateContractExtensionRequestStatus = (
    id: ExtensionRequestId,
    status: ContractExtensionRequestStatus,
) => {
    return prisma.contractExtensionRequest.update({
        where: {
            id,
        },
        data: {
            status,
        },
    });
};

export const getContractExtensionRequestByContractId = (contractId: string) => {
    return prisma.contractExtensionRequest.findMany({
        where: {
            contractId,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
};

export const getContractExtensionRequestPendingByContractId = (contractId: string) => {
    return prisma.contractExtensionRequest.findFirst({
        where: {
            contractId,
            status: ContractExtensionRequestStatus.PENDING,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
};

export const updateContractExtensionRequest = (id: ExtensionRequestId, data: CreateContractExtensionRequest) => {
    return prisma.contractExtensionRequest.update({
        where: {
            id,
        },
        data,
    });
};

export const findContractExtensionRequestById = (id: ExtensionRequestId) => {
    return prisma.contractExtensionRequest.findUnique({
        where: {
            id,
        },
    });
};
