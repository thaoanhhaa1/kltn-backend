import { Contract } from '@prisma/client';
import {
    createContract,
    deleteContractById,
    getAllContracts,
    getContractById,
    getContractsByOwnerId,
    getContractsByRenterId,
    softDeleteContractById,
    updateContractById,
} from '../repositories/contract.repository';
import { CreateContractReq } from '../schemas/contract.schema';
import { IUpdateContractReq } from '../interfaces/contract';

export const createContractService = async (contract: CreateContractReq): Promise<Contract> => {
    return createContract(contract);
};

export const getAllContractsService = async (): Promise<Array<Contract>> => {
    return getAllContracts();
};

export const getContractByIdService = async (updateContractReq: IUpdateContractReq): Promise<Contract | null> => {
    return getContractById(updateContractReq);
};

export const getContractsByOwnerIdService = async (ownerId: number): Promise<Contract[]> => {
    return getContractsByOwnerId(ownerId);
};

export const getContractsByRenterIdService = async (renterId: number): Promise<Contract[]> => {
    return getContractsByRenterId(renterId);
};

export const updateContractByIdService = async (
    contractId: number,
    contract: CreateContractReq,
): Promise<Contract | null> => {
    return updateContractById(contractId, contract);
};

export const softDeleteContractByIdService = async (contractId: number): Promise<Contract | null> => {
    return softDeleteContractById(contractId);
};

export const deleteContractByIdService = async (contractId: number): Promise<Contract | null> => {
    return deleteContractById(contractId);
};
