import { IPagination } from '../interface/pagination';
import { IOwnerUpdateRentalRequestStatus, IRenterUpdateRentalRequestStatus } from '../interface/rentalRequest';
import { IUserId } from '../interface/user';
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
            renterId,
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
                rentalDeposit,
                rentalEndDate,
                rentalPrice,
                rentalStartDate,
                status: 'PENDING',
            },
        });

    return prisma.rentalRequest.create({
        data: {
            property,
            rentalDeposit,
            rentalEndDate,
            rentalPrice,
            rentalStartDate,
            renterId,
            ownerId,
        },
    });
};

export const getRentalRequestsByRenter = (renterId: IUserId, { skip, take }: IPagination) => {
    return prisma.rentalRequest.findMany({
        where: {
            renterId,
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
            renterId,
            status: {
                not: 'CANCELLED',
            },
        },
    });
};

export const getRentalRequestsByOwner = (ownerId: IUserId, { skip, take }: IPagination) => {
    return prisma.rentalRequest.findMany({
        where: {
            ownerId,
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
            ownerId,
            status: {
                not: 'CANCELLED',
            },
        },
    });
};

export const getRentalRequestByRenter = (renterId: IUserId, slug: string) => {
    return prisma.rentalRequest.findFirst({
        where: {
            renterId,
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
            ownerId,
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
            ownerId,
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
            renterId,
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

export const getRentalRequestById = (requestId: string) => {
    return prisma.rentalRequest.findUnique({
        where: {
            requestId,
        },
    });
};
