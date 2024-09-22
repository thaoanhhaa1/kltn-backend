import { IPagination } from '../interfaces/pagination';
import {
    IOwnerUpdateRentalRequestStatus,
    IRenterUpdateRentalRequestStatus,
    IRequestId,
} from '../interfaces/rentalRequest';
import { IUserId } from '../interfaces/user';
import prisma from '../prisma/prismaClient';
import { ICreateRentalRequest } from '../schemas/rentalRequest.schema';

export const createRentalRequest = async ({
    ownerId,
    property,
    rentalDeposit,
    rentalEndDate,
    rentalPrice,
    rentalStartDate,
    renterId,
}: ICreateRentalRequest) => {
    const rentalRequest = await prisma.rentalRequest.findFirst({
        where: {
            renter_id: renterId,
            property: {
                is: {
                    property_id: property.propertyId,
                },
            },
            status: 'PENDING',
        },
    });

    if (rentalRequest)
        return prisma.rentalRequest.update({
            where: {
                request_id: rentalRequest.request_id,
            },
            data: {
                rental_deposit: rentalDeposit,
                rental_end_date: rentalEndDate,
                rental_price: rentalPrice,
                rental_start_date: rentalStartDate,
                status: 'PENDING',
            },
        });

    return prisma.rentalRequest.create({
        data: {
            property_id: property.propertyId,
            rental_deposit: rentalDeposit,
            rental_end_date: rentalEndDate,
            rental_price: rentalPrice,
            rental_start_date: rentalStartDate,
            renter_id: renterId,
            owner_id: ownerId,
        },
    });
};

export const getRentalRequestsByRenter = (renterId: IUserId, { skip, take }: IPagination) => {
    return prisma.rentalRequest.findMany({
        where: {
            renter_id: renterId,
            status: {
                not: 'CANCELLED',
            },
        },
        skip,
        take,
    });
};

export const countRentalRequestsByRenter = (renterId: IUserId) => {
    return prisma.rentalRequest.count({
        where: {
            renter_id: renterId,
            status: {
                not: 'CANCELLED',
            },
        },
    });
};

export const getRentalRequestsByOwner = (ownerId: IUserId, { skip, take }: IPagination) => {
    return prisma.rentalRequest.findMany({
        where: {
            owner_id: ownerId,
            status: {
                not: 'CANCELLED',
            },
        },
        skip,
        take,
        orderBy: {
            created_at: 'desc',
        },
    });
};

export const countRentalRequestsByOwner = (ownerId: IUserId) => {
    return prisma.rentalRequest.count({
        where: {
            owner_id: ownerId,
            status: {
                not: 'CANCELLED',
            },
        },
    });
};

export const getRentalRequestByRenter = (renterId: IUserId, slug: string) => {
    return prisma.rentalRequest.findFirst({
        where: {
            renter_id: renterId,
            property: {
                is: {
                    slug,
                },
            },
        },
    });
};

export const getRentalRequestByOwner = (ownerId: IUserId, slug: string) => {
    return prisma.rentalRequest.findFirst({
        where: {
            owner_id: ownerId,
            property: {
                is: {
                    slug,
                },
            },
        },
        include: {
            renter: true,
        },
    });
};

export const ownerUpdateRentalRequestStatus = ({ ownerId, slug, status }: IOwnerUpdateRentalRequestStatus) => {
    return prisma.rentalRequest.updateMany({
        where: {
            owner_id: ownerId,
            property: {
                is: {
                    slug,
                },
            },
            status: 'PENDING',
        },
        data: {
            status,
        },
    });
};

export const renterUpdateRentalRequestStatus = ({ renterId, slug, status }: IRenterUpdateRentalRequestStatus) => {
    return prisma.rentalRequest.updateMany({
        where: {
            renter_id: renterId,
            property: {
                is: {
                    slug,
                },
            },
            status: 'PENDING',
        },
        data: {
            status,
        },
    });
};

export const getRentalRequestById = (requestId: IRequestId) => {
    return prisma.rentalRequest.findUnique({
        where: {
            request_id: requestId,
        },
    });
};
