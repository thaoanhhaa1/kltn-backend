import { Contract, Transaction } from '@prisma/client';
import { IUserId } from './user';
import { ContractCancellationRequestId } from './contractCancellationRequest';

export type IContractId = Contract['contractId'];

export interface CreateContractReq {
    ownerId: string; // ID của chủ nhà
    renterId: string; // ID của người thuê
    propertyId: string; // ID tài sản
    startDate: Date; // Ngày bắt đầu hợp đồng
    endDate: Date; // Ngày kết thúc hợp đồng
    contractTerms: string; // Điều khoản hợp đồng
    monthlyRent: number; // Giá thuê hàng tháng
    depositAmount: number; // Số tiền đặt cọc
}

export interface IContract extends CreateContractReq {
    contractId: string;
    ownerWalletAddress: string;
    renterWalletAddress: string;
}

export interface IDeposit {
    contractId: Contract['contractId'];
    renterId: IUserId;
    transactionId: Transaction['id'];
}

export interface IGetContractInRange {
    propertyId: string;
    rentalStartDate: string;
    rentalEndDate: string;
}

export interface ICancelContract {
    propertyId: string;
    rentalStartDate: string;
    rentalEndDate: string;
}

export interface ICancelSmartContractBeforeDeposit {
    userId: IUserId;
    contractId: IContractId;
    isOverdue?: boolean;
}

export interface ICancelContractBeforeDeposit {
    contractId: IContractId;
    userId: IUserId;
}

export interface IFindContractByIdAndUser {
    contractId: IContractId;
    userId: IUserId;
}

export interface IEndContract {
    contractId: IContractId;
    id: ContractCancellationRequestId;
}

export interface IGetContractDetail {
    contractId: IContractId;
    userId: IUserId;
}

export interface ICreateContract extends IContract {
    transactionHash: string;
}
