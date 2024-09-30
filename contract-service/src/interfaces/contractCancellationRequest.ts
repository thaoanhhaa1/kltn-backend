import { ContractCancellationRequest } from '@prisma/client';
import { IUserId } from './user';

export type ContractCancellationRequestId = ContractCancellationRequest['id'];

export interface IRejectCancellationRequest {
    requestId: ContractCancellationRequestId;
    userId?: IUserId;
}
