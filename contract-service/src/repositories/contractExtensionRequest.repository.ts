import { ContractExtensionRequestStatus, ContractExtensionRequestType } from '@prisma/client';
import { subHours } from 'date-fns';
import prisma from '../prisma/prismaClient';
import getDateBefore from '../utils/getDateBefore';
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

export const getContractExtensionRequestPendingByContractId = (
    contractId: string,
    type: ContractExtensionRequestType,
) => {
    return prisma.contractExtensionRequest.findFirst({
        where: {
            contractId,
            status: ContractExtensionRequestStatus.PENDING,
            type,
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

export const countExtensionRequestByUserId = (userId: string) => {
    return prisma.contractExtensionRequest.count({
        where: {
            status: 'PENDING',
            contract: {
                ownerId: userId,
            },
        },
    });
};

export const cancelExtensionRequestWhenEndContract = (contractId: string) => {
    return prisma.contractExtensionRequest.updateMany({
        where: {
            contractId,
            status: 'PENDING',
        },
        data: {
            status: 'CANCELLED',
        },
    });
};

export const getRemindExtensionRequest = () => {
    const now = new Date();
    const after2Days = getDateBefore(now, 2);
    const after3Days = getDateBefore(now, 3);
    const after5Days = getDateBefore(now, 5);
    const after6Days = getDateBefore(now, 6);

    const after2DaysMinus7H = new Date(subHours(new Date(after2Days), 7));
    const after3DaysMinus7H = new Date(subHours(new Date(after3Days), 7));
    const after5DaysMinus7H = new Date(subHours(new Date(after5Days), 7));
    const after6DaysMinus7H = new Date(subHours(new Date(after6Days), 7));

    return prisma.contractExtensionRequest.findMany({
        where: {
            status: 'PENDING',
            OR: [
                {
                    createdAt: {
                        gte: after3DaysMinus7H,
                        lt: after2DaysMinus7H,
                    },
                },
                {
                    createdAt: {
                        gte: after6DaysMinus7H,
                        lt: after5DaysMinus7H,
                    },
                },
            ],
        },
        include: {
            contract: {
                select: {
                    ownerId: true,
                },
            },
        },
    });
};

export const getOverdueExtensionRequest = () => {
    const now = new Date();
    const before7Days = getDateBefore(now, 7);

    const before7DaysMinus7H = new Date(subHours(new Date(before7Days), 7));

    return prisma.contractExtensionRequest.findMany({
        where: {
            status: 'PENDING',
            createdAt: {
                lt: before7DaysMinus7H,
            },
        },
        include: {
            contract: {
                select: {
                    ownerId: true,
                    renterId: true,
                },
            },
        },
    });
};

export const cancelExtensionRequest = (ids: Array<ExtensionRequestId>) => {
    return prisma.contractExtensionRequest.updateMany({
        where: {
            id: {
                in: ids,
            },
        },
        data: {
            status: 'CANCELLED',
        },
    });
};
