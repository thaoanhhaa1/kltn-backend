import { IPagination, IPaginationResponse } from '../interfaces/pagination';
import {
    IGenerateContract,
    IOwnerUpdateRentalRequestStatus,
    IRentalRequest,
    IRenterUpdateRentalRequestStatus,
} from '../interfaces/rentalRequest';
import { IUserId } from '../interfaces/user';
import { getContractInRange } from '../repositories/contract.repository';
import {
    countRentalRequestsByOwner,
    countRentalRequestsByRenter,
    createRentalRequest,
    getRentalRequestAndPropertyById,
    getRentalRequestById,
    getRentalRequestByOwner,
    getRentalRequestByRenter,
    getRentalRequestsByOwner,
    getRentalRequestsByRenter,
    ownerUpdateRentalRequestStatus,
    renterUpdateRentalRequestStatus,
} from '../repositories/rentalRequest.repository';
import { findUserById, isConnectToWallet } from '../repositories/user.repository';
import { ICreateRentalRequest } from '../schemas/rentalRequest.schema';
import { convertDateToDB } from '../utils/convertDate';
import convertDateToString from '../utils/convertDateToString.util';
import { createContract } from '../utils/createContract.util';
import CustomError from '../utils/error.util';
import getPageInfo from '../utils/getPageInfo';
import { getPropertyByIdService, getPropertyBySlugService } from './property.service';
import { findUserDetailByUserIdService } from './user.service';

export const createRentalRequestService = async ({ rentalEndDate, rentalStartDate, ...rest }: ICreateRentalRequest) => {
    console.log("Here's the rentalEndDate:", rentalEndDate);

    const renterId = rest.renterId;

    const [isConnect, userDetail, contract] = await Promise.all([
        isConnectToWallet(renterId),
        findUserDetailByUserIdService(renterId),
        getContractInRange({
            propertyId: rest.propertyId,
            rentalEndDate: convertDateToDB(rentalEndDate),
            rentalStartDate: convertDateToDB(rentalStartDate),
        }),
    ]);

    if (!isConnect) throw new CustomError(400, 'Tài khoản chưa kết nối ví điện tử');
    if (!userDetail) throw new CustomError(400, 'Tài khoản chưa xác thực thông tin');

    if (contract)
        throw new CustomError(
            400,
            `Bất động sản đã có hợp đồng trong thời gian ${convertDateToString(
                new Date(contract.startDate),
            )} - ${convertDateToString(new Date(contract.endDateActual))}`,
        );

    return createRentalRequest({
        ...rest,
        rentalEndDate: convertDateToDB(rentalEndDate),
        rentalStartDate: convertDateToDB(rentalStartDate),
    });
};

export const getRentalRequestsByRenterService = async (renterId: IUserId, pagination: IPagination) => {
    const [rentalRequests, count] = await Promise.all([
        getRentalRequestsByRenter(renterId, pagination),
        countRentalRequestsByRenter(renterId),
    ]);

    const result: IPaginationResponse<IRentalRequest> = {
        data: rentalRequests,
        pageInfo: getPageInfo({
            ...pagination,
            count,
        }),
    };

    return result;
};

export const getRentalRequestsByOwnerService = async (ownerId: IUserId, pagination: IPagination) => {
    const [rentalRequests, count] = await Promise.all([
        getRentalRequestsByOwner(ownerId, pagination),
        countRentalRequestsByOwner(ownerId),
    ]);

    const result: IPaginationResponse<IRentalRequest> = {
        data: rentalRequests,
        pageInfo: getPageInfo({
            ...pagination,
            count,
        }),
    };

    return result;
};

export const getRentalRequestByRenterService = async (renterId: IUserId, slug: string) => {
    const [property, rentalRequest] = await Promise.all([
        getPropertyBySlugService(slug),
        getRentalRequestByRenter(renterId, slug),
    ]);

    if (!property || !rentalRequest) throw new CustomError(404, 'Yêu cầu thuê không tồn tại');

    return {
        ...rentalRequest,
        property,
    };
};

export const getRentalRequestByOwnerService = async (ownerId: IUserId, slug: string) => {
    const [property, rentalRequest] = await Promise.all([
        getPropertyBySlugService(slug),
        getRentalRequestByOwner(ownerId, slug),
    ]);

    if (!property || !rentalRequest) throw new CustomError(404, 'Yêu cầu thuê không tồn tại');

    return {
        ...rentalRequest,
        property,
    };
};

export const ownerUpdateRentalRequestStatusService = async (params: IOwnerUpdateRentalRequestStatus) => {
    try {
        return await ownerUpdateRentalRequestStatus(params);
    } catch (error) {
        throw new CustomError(400, 'Cập nhật trạng thái yêu cầu thuê không thành công');
    }
};

export const renterUpdateRentalRequestStatusService = async (params: IRenterUpdateRentalRequestStatus) => {
    try {
        return await renterUpdateRentalRequestStatus(params);
    } catch (error) {
        throw new CustomError(400, 'Cập nhật trạng thái yêu cầu thuê không thành công');
    }
};

export const generateContractService = async ({ ownerId, propertyId, renterId, requestId }: IGenerateContract) => {
    try {
        const [owner, ownerDetail, renter, renterDetail, property, rentalRequest] = await Promise.all([
            findUserById(ownerId),
            findUserDetailByUserIdService(ownerId),
            findUserById(renterId),
            findUserDetailByUserIdService(renterId),
            getPropertyByIdService(propertyId),
            getRentalRequestById(requestId),
        ]);

        if (!owner) throw new CustomError(404, 'Chủ nhà không tồn tại');
        if (!renter) throw new CustomError(404, 'Người thuê không tồn tại');
        if (!ownerDetail) throw new CustomError(404, 'Chủ nhà chưa xác thực thông tin');
        if (!renterDetail) throw new CustomError(404, 'Người thuê chưa xác thực thông tin');
        if (!property) throw new CustomError(404, 'Bất động sản không tồn tại');
        if (!rentalRequest) throw new CustomError(404, 'Yêu cầu thuê không tồn tại');

        const date = new Date();

        return {
            contractContent: createContract({
                city: property.address.city,
                date,
                owner,
                ownerDetail,
                renter,
                renterDetail,
                property,
                rentalRequest,
            }),
            ownerId,
            renterId,
            propertyId,
            startDate: rentalRequest.rentalStartDate,
            endDate: rentalRequest.rentalEndDate,
            monthlyRent: rentalRequest.rentalPrice,
            depositAmount: rentalRequest.rentalDeposit,
        };
    } catch (error) {
        console.log("Here's the error:", error);

        throw error;
    }
};

export const getRentalRequestAndPropertyByIdService = async (requestId: number) => {
    const rentalRequest = await getRentalRequestAndPropertyById(requestId);

    if (!rentalRequest) throw new CustomError(404, 'Yêu cầu thuê không tồn tại');

    return rentalRequest;
};
