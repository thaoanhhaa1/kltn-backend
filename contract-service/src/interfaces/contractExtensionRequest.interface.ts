import { ContractExtensionRequest, ContractExtensionRequestStatus } from '@prisma/client';
import { ICreateContractExtensionRequest } from '../schemas/contractExtensionRequest.schema';
import { IUserId } from './user';

export type CreateContractExtensionRequest = Omit<ICreateContractExtensionRequest, 'userId'> & {
    date: Date;
};

export type ExtensionRequestId = Pick<ContractExtensionRequest, 'id'>['id'];

export interface IUpdateContractExtensionRequestStatus {
    id: ExtensionRequestId;
    status: ContractExtensionRequestStatus;
    userId: IUserId;
    contractId: ContractExtensionRequest['contractId'];
}
