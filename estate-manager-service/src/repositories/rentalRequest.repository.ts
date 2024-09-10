import { IOwnerUpdateRentalRequestStatus, IRenterUpdateRentalRequestStatus } from '../interface/rentalRequest';
import { IUserId } from '../interface/user';
import prisma from '../prisma/prismaClient';
import { ICreateRentalRequest } from '../schemas/rentalRequest.schema';

export const createRentalRequest = ({ rentalEndDate, rentalStartDate, ...rest }: ICreateRentalRequest) => {
    return prisma.rentalRequest.create({
        data: {
            ...rest,
            rentalEndDate: new Date(rentalEndDate),
            rentalStartDate: new Date(rentalStartDate),
        },
    });
};

export const getRentalRequestsByRenter = (renterId: IUserId) => {
    return prisma.rentalRequest.findMany({
        where: {
            renterId,
            status: {
                not: 'CANCELLED',
            },
        },
    });
};

export const getRentalRequestsByOwner = (ownerId: IUserId) => {
    return prisma.rentalRequest.findMany({
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
