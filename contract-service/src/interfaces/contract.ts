import { Contract, Transaction } from '@prisma/client';
import { IUserId } from './user';

export type IContractId = Contract['contract_id'];

export interface CreateContractReq {
    owner_user_id: string; // ID của chủ nhà
    renter_user_id: string; // ID của người thuê
    property_id: string; // ID tài sản
    start_date: Date; // Ngày bắt đầu hợp đồng
    end_date: Date; // Ngày kết thúc hợp đồng
    contract_terms: string; // Điều khoản hợp đồng
    monthly_rent: number; // Giá thuê hàng tháng
    deposit_amount: number; // Số tiền đặt cọc
}

export interface IContract extends CreateContractReq {
    contract_id: string;
    owner_wallet_address: string;
    renter_wallet_address: string;
}

export interface IDeposit {
    contractId: Contract['contract_id'];
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
}

export interface ICancelContractBeforeDeposit {
    contractId: IContractId;
    userId: IUserId;
}

export interface IFindContractByIdAndUser {
    contractId: IContractId;
    userId: IUserId;
}
