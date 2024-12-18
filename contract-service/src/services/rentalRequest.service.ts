import { IPagination, IPaginationResponse } from '../interfaces/pagination';
import {
    IGenerateContract,
    IGetRentalRequestsByOwner,
    IGetRentalRequestsByRenter,
    IOwnerUpdateRentalRequestStatus,
    IRentalRequest,
    IRenterUpdateRentalRequestStatus,
} from '../interfaces/rentalRequest';
import { IUserId } from '../interfaces/user';
import { getContractInRange } from '../repositories/contract.repository';
import {
    countPendingRentalRequestsByOwner,
    countRentalRequestsByOwner,
    countRentalRequestsByRenter,
    createRentalRequest,
    getOwnerCbbForRenter,
    getPendingRentalRequestsByOwner,
    getPropertyCbbForRenter,
    getRentalRequestAndPropertyById,
    getRentalRequestById,
    getRentalRequestByOwner,
    getRentalRequestByRenter,
    getRentalRequestsByOwner,
    getRentalRequestsByRenter,
    getRenterRequestByOwner,
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

export const getRentalRequestsByRenterService = async (data: IGetRentalRequestsByRenter) => {
    const [rentalRequests, count] = await Promise.all([
        getRentalRequestsByRenter(data),
        countRentalRequestsByRenter(data),
    ]);

    const result: IPaginationResponse<IRentalRequest> = {
        data: rentalRequests,
        pageInfo: getPageInfo({
            skip: data.skip,
            take: data.take,
            count,
        }),
    };

    return result;
};

export const getRentalRequestsByOwnerService = async (data: IGetRentalRequestsByOwner) => {
    const rentalStartDate = data.rentalStartDate ? convertDateToDB(data.rentalStartDate) : undefined;
    const rentalEndDate = data.rentalEndDate ? convertDateToDB(data.rentalEndDate) : undefined;

    const newData = { ...data, rentalStartDate, rentalEndDate };

    const [rentalRequests, count] = await Promise.all([
        getRentalRequestsByOwner(newData),
        countRentalRequestsByOwner(newData),
    ]);

    const result: IPaginationResponse<IRentalRequest> = {
        data: rentalRequests,
        pageInfo: getPageInfo({
            count,
            skip: data.skip,
            take: data.take,
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

        const contract = await getContractInRange({
            propertyId: propertyId,
            rentalEndDate: convertDateToDB(rentalRequest.rentalEndDate),
            rentalStartDate: convertDateToDB(rentalRequest.rentalStartDate),
        });

        if (contract)
            throw new CustomError(
                400,
                `Bất động sản đã có hợp đồng trong thời gian ${convertDateToString(
                    new Date(contract.startDate),
                )} - ${convertDateToString(new Date(contract.endDateActual))}`,
            );

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

export const getPendingRentalRequestsByOwnerService = async (ownerId: IUserId, pagination: IPagination) => {
    const [rentalRequests, count] = await Promise.all([
        getPendingRentalRequestsByOwner(ownerId, pagination),
        countPendingRentalRequestsByOwner(ownerId),
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

export const getRenterRequestByOwnerService = (ownerId: IUserId) => {
    return getRenterRequestByOwner(ownerId);
};

export const getOwnerCbbForRenterService = (renterId: IUserId) => {
    return getOwnerCbbForRenter(renterId);
};

export const getPropertyCbbForRenterService = (renterId: IUserId) => {
    return getPropertyCbbForRenter(renterId);
};
