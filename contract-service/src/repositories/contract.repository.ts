import { Contract } from '@prisma/client';
import prisma from '../prisma/prismaClient';
import { CreateContractReq } from '../schemas/contract.schema';
import { IUpdateContractReq } from '../interfaces/contract';

export const createContract = async (contract: CreateContractReq): Promise<Contract> => {
    return prisma.contract.create({
        data: contract,
    });
};

export const getAllContracts = async (): Promise<Array<Contract>> => {
    return prisma.contract.findMany();
};

export const getContractById = async ({ contractId, userId }: IUpdateContractReq): Promise<Contract | null> => {
    return prisma.contract.findUnique({
        where: {
            contract_id: contractId,
            OR: [
                {
                    owner_id: userId,
                },
                {
                    renter_id: userId,
                },
            ],
        },
    });
};

export const getContractsByOwnerId = async (ownerId: number): Promise<Contract[]> => {
    return prisma.contract.findMany({
        where: {
            owner_id: ownerId,
        },
    });
};

export const getContractsByRenterId = async (renterId: number): Promise<Contract[]> => {
    return prisma.contract.findMany({
        where: {
            renter_id: renterId,
        },
    });
};

export const updateContractById = async (contractId: number, contract: CreateContractReq): Promise<Contract | null> => {
    return prisma.contract.update({
        where: {
            contract_id: contractId,
        },
        data: contract,
    });
};

export const softDeleteContractById = async (contractId: number): Promise<Contract | null> => {
    return prisma.contract.update({
        where: {
            contract_id: contractId,
        },
        data: {
            deleted: true,
        },
    });
};

export const deleteContractById = async (contractId: number): Promise<Contract | null> => {
    return prisma.contract.delete({
        where: {
            contract_id: contractId,
        },
    });
};
