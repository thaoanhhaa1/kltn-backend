import { Contract, Status, Transaction } from '@prisma/client';
import { IUserId } from './user';
import { ContractCancellationRequestId } from './contractCancellationRequest';
import { IPagination } from './pagination';

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
    signature: string;
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
    isAdmin: boolean;
}

export interface ICreateContract extends IContract {
    transactionHash: string;
    propertyJson: string;
}

export interface IGenerateContract {
    ownerId: IUserId;
    propertyId: string;
    renterId: IUserId;
    rentalStartDate: string;
    rentalEndDate: string;
    rentalDeposit: number;
    rentalPrice: number;
}

export type IGetContractsTable = IPagination & {
    contractId?: IContractId;
    title?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    monthlyRent?: number;
    depositAmount?: number;
    status?: Status;
    propertyId?: string;
};

export type IGetContractsByOwner = IGetContractsTable & {
    ownerId: IUserId;
    renterId?: IUserId;
};

export type IGetContractsByRenter = IGetContractsTable & {
    renterId: IUserId;
    ownerId?: IUserId;
    field?: string;
    order?: 'asc' | 'desc';
};
