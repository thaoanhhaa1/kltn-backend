import { IPagination, IPaginationResponse } from '../interface/pagination';
import {
    IGenerateContract,
    IOwnerUpdateRentalRequestStatus,
    IRentalRequest,
    IRenterUpdateRentalRequestStatus,
} from '../interface/rentalRequest';
import { IUserId } from '../interface/user';
import { getPropertyById, getPropertyBySlug } from '../repositories/property.repository';
import {
    countRentalRequestsByOwner,
    countRentalRequestsByRenter,
    createRentalRequest,
    getRentalRequestById,
    getRentalRequestByOwner,
    getRentalRequestByRenter,
    getRentalRequestsByOwner,
    getRentalRequestsByRenter,
    ownerUpdateRentalRequestStatus,
    renterUpdateRentalRequestStatus,
} from '../repositories/rentalRequest.repository';
import { findOwnerId, findUserById } from '../repositories/user.repository';
import { findUserDetailByUserId } from '../repositories/userDetail.repository';
import { ICreateRentalRequest } from '../schemas/rentalRequest.schema';
import { convertDateToDB } from '../utils/convertDate';
import { createContract } from '../utils/createContract.util';
import CustomError from '../utils/error.util';
import getPageInfo from '../utils/getPageInfo';

export const createRentalRequestService = ({ rentalEndDate, rentalStartDate, ...rest }: ICreateRentalRequest) => {
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
        getPropertyBySlug(slug),
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
        getPropertyBySlug(slug),
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
            findOwnerId(ownerId),
            findUserDetailByUserId(ownerId),
            findUserById(renterId),
            findUserDetailByUserId(renterId),
            getPropertyById(propertyId),
            getRentalRequestById(requestId),
        ]);

        if (!owner) throw new CustomError(404, 'Chủ nhà không tồn tại');
        if (!renter) throw new CustomError(404, 'Người thuê không tồn tại');
        if (!ownerDetail) throw new CustomError(404, 'Chủ nhà chưa xác thực thông tin');
        if (!renterDetail) throw new CustomError(404, 'Người thuê chưa xác thực thông tin');
        if (!property) throw new CustomError(404, 'Bất động sản không tồn tại');
        if (!rentalRequest) throw new CustomError(404, 'Yêu cầu thuê không tồn tại');

        return {
            contractContent: createContract({
                city: property.address.city,
                date: new Date(),
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
        console.log(error);
        throw new CustomError(400, 'Tạo hợp đồng không thành công');
    }
};
