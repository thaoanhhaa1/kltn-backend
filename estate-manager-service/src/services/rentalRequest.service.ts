import { IPagination, IPaginationResponse } from '../interface/pagination';
import {
    IOwnerUpdateRentalRequestStatus,
    IRentalRequest,
    IRenterUpdateRentalRequestStatus,
} from '../interface/rentalRequest';
import { IUserId } from '../interface/user';
import { getPropertyBySlug } from '../repositories/property.repository';
import {
    countRentalRequestsByOwner,
    countRentalRequestsByRenter,
    createRentalRequest,
    getRentalRequestByOwner,
    getRentalRequestByRenter,
    getRentalRequestsByOwner,
    getRentalRequestsByRenter,
    ownerUpdateRentalRequestStatus,
    renterUpdateRentalRequestStatus,
} from '../repositories/rentalRequest.repository';
import { ICreateRentalRequest } from '../schemas/rentalRequest.schema';
import { convertDateToDB } from '../utils/convertDate';
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
