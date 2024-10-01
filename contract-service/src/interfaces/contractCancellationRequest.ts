import { ContractCancellationRequest, ContractCancellationRequestStatus } from '@prisma/client';
import { IUserId } from './user';

export type ContractCancellationRequestId = ContractCancellationRequest['id'];

export interface ICancellationRequest {
    requestId: ContractCancellationRequestId;
    status: ContractCancellationRequestStatus;
    userId?: IUserId;
}
