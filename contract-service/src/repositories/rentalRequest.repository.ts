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
            renterId: renterId,
            property: {
                is: {
                    propertyId: property.propertyId,
                },
            },
            status: 'PENDING',
        },
    });

    if (rentalRequest)
        return prisma.rentalRequest.update({
            where: {
                requestId: rentalRequest.requestId,
            },
            data: {
                rentalDeposit: rentalDeposit,
                rentalEndDate: rentalEndDate,
                rentalPrice: rentalPrice,
                rentalStartDate: rentalStartDate,
                status: 'PENDING',
            },
        });

    return prisma.rentalRequest.create({
        data: {
            propertyId: property.propertyId,
            rentalDeposit: rentalDeposit,
            rentalEndDate: rentalEndDate,
            rentalPrice: rentalPrice,
            rentalStartDate: rentalStartDate,
            renterId: renterId,
            ownerId: ownerId,
        },
    });
};

export const getRentalRequestsByRenter = (renterId: IUserId, { skip, take }: IPagination) => {
    return prisma.rentalRequest.findMany({
        where: {
            renterId: renterId,
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
            renterId: renterId,
            status: {
                not: 'CANCELLED',
            },
        },
    });
};

export const getRentalRequestsByOwner = (ownerId: IUserId, { skip, take }: IPagination) => {
    return prisma.rentalRequest.findMany({
        where: {
            ownerId: ownerId,
            status: {
                not: 'CANCELLED',
            },
        },
        skip,
        take,
        orderBy: {
            createdAt: 'desc',
        },
    });
};

export const countRentalRequestsByOwner = (ownerId: IUserId) => {
    return prisma.rentalRequest.count({
        where: {
            ownerId: ownerId,
            status: {
                not: 'CANCELLED',
            },
        },
    });
};

export const getRentalRequestByRenter = (renterId: IUserId, slug: string) => {
    return prisma.rentalRequest.findFirst({
        where: {
            renterId: renterId,
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
            ownerId: ownerId,
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
            ownerId: ownerId,
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
            renterId: renterId,
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
            requestId: requestId,
        },
    });
};
