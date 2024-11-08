import {
    ICountRentalRequestByDay,
    ICountRentalRequestByMonth,
    ICountRentalRequestByStatus,
    ICountRentalRequestByWeek,
    IGetRentalRequestRating,
} from '../interfaces/dashboard';
import { IPagination } from '../interfaces/pagination';
import { IOwnerUpdateRentalRequestStatus, IRenterUpdateRentalRequestStatus } from '../interfaces/rentalRequest';
import { IUserId } from '../interfaces/user';
import prisma from '../prisma/prismaClient';
import { ICreateRentalRequest } from '../schemas/rentalRequest.schema';

export const createRentalRequest = async ({
    ownerId,
    propertyId,
    rentalDeposit,
    rentalEndDate,
    rentalPrice,
    rentalStartDate,
    renterId,
}: ICreateRentalRequest) => {
    const rentalRequest = await prisma.rentalRequest.findFirst({
        where: {
            renterId,
            propertyId,
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
            rentalDeposit,
            rentalEndDate,
            rentalPrice,
            rentalStartDate,
            renterId,
            ownerId,
            propertyId,
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
        include: {
            property: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
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
        include: {
            property: true,
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

export const ownerUpdateRentalRequestStatus = ({ ownerId, requestId, status }: IOwnerUpdateRentalRequestStatus) => {
    return prisma.rentalRequest.updateMany({
        where: {
            ownerId,
            requestId,
            status: 'PENDING',
        },
        data: {
            status,
        },
    });
};

export const renterUpdateRentalRequestStatus = ({ renterId, requestId, status }: IRenterUpdateRentalRequestStatus) => {
    return prisma.rentalRequest.updateMany({
        where: {
            renterId,
            requestId,
            status: 'PENDING',
        },
        data: {
            status,
        },
    });
};

export const getRentalRequestById = (requestId: number) => {
    return prisma.rentalRequest.findUnique({
        where: {
            requestId,
        },
    });
};

export const getRentalRequestAndPropertyById = (requestId: number) => {
    return prisma.rentalRequest.findUnique({
        where: {
            requestId,
        },
        include: {
            property: {
                select: {
                    title: true,
                },
            },
        },
    });
};

export const countRentalRequestByUserId = (userId: IUserId) => {
    return prisma.rentalRequest.count({
        where: {
            ownerId: userId,
            status: 'PENDING',
        },
    });
};

export const getRentalRequestRating = (ownerId: IUserId, year: number): Promise<Array<IGetRentalRequestRating>> => {
    return prisma.$queryRaw`
        SELECT
            EXTRACT(MONTH FROM created_at) as month,
            EXTRACT(YEAR FROM created_at) as year,
            status,
            COUNT(*) AS count
        FROM
            "\`rental_requests\`"
        WHERE status != 'CANCELLED'
            AND owner_id = ${ownerId}
            AND EXTRACT(YEAR FROM created_at) = ${year}
        GROUP BY
            EXTRACT(MONTH FROM created_at),
            EXTRACT(YEAR FROM created_at),
            status
        ORDER BY
            EXTRACT(YEAR FROM created_at),
            EXTRACT(MONTH FROM created_at),
            status;
    `;
};

// count rental requests by day in a month
export const countRentalRequestByDay = (year: number, month: number): Promise<Array<ICountRentalRequestByDay>> => {
    return prisma.$queryRaw`
        SELECT
            EXTRACT(DAY FROM created_at) as day,
            COUNT(*) AS count
        FROM
            "\`rental_requests\`"
        WHERE status != 'CANCELLED'
            AND EXTRACT(YEAR FROM created_at) = ${year}
            AND EXTRACT(MONTH FROM created_at) = ${month}
        GROUP BY
            EXTRACT(DAY FROM created_at)
        ORDER BY
            EXTRACT(DAY FROM created_at);
    `;
};

// count rental requests by week in a month
export const countRentalRequestByWeek = (year: number, month: number): Promise<Array<ICountRentalRequestByWeek>> => {
    return prisma.$queryRaw`
        SELECT
            EXTRACT(WEEK FROM created_at) as week,
            COUNT(*) AS count
        FROM
            "\`rental_requests\`"
        WHERE status != 'CANCELLED'
            AND EXTRACT(YEAR FROM created_at) = ${year}
            AND EXTRACT(MONTH FROM created_at) = ${month}
        GROUP BY
            EXTRACT(WEEK FROM created_at)
        ORDER BY
            EXTRACT(WEEK FROM created_at);
    `;
};

// count rental requests by month in a year
export const countRentalRequestByMonth = (year: number): Promise<Array<ICountRentalRequestByMonth>> => {
    return prisma.$queryRaw`
        SELECT
            EXTRACT(MONTH FROM created_at) as month,
            COUNT(*) AS count
        FROM
            "\`rental_requests\`"
        WHERE status != 'CANCELLED'
            AND EXTRACT(YEAR FROM created_at) = ${year}
        GROUP BY
            EXTRACT(MONTH FROM created_at)
        ORDER BY
            EXTRACT(MONTH FROM created_at);
    `;
};

// count rental requests by status in a month
export const countRentalRequestByStatus = (
    year: number,
    month: number,
): Promise<Array<ICountRentalRequestByStatus>> => {
    return prisma.$queryRaw`
        SELECT
            status,
            COUNT(*) AS count
        FROM
            "\`rental_requests\`"
        WHERE status != 'CANCELLED'
            AND EXTRACT(YEAR FROM created_at) = ${year}
            AND EXTRACT(MONTH FROM created_at) = ${month}
        GROUP BY
            status;
    `;
};
