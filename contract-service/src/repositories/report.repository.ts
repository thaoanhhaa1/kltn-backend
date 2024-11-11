import {
    ICreateReportForRenterRequest,
    IFindReportsAndLastChild,
    IGetReportByOwnerId,
    IGetReportByRenterId,
    ReportId,
} from '../interfaces/report';
import { IUserId } from '../interfaces/user';
import prisma from '../prisma/prismaClient';
import { IGetReportByAdmin } from './../interfaces/report';

const reportsSelect = {
    id: true,
    title: true,
    priority: true,
    type: true,
    createdAt: true,
    ownerId: true,
    renterId: true,
    contractId: true,
    reportChild: {
        select: {
            id: true,
            status: true,
            proposed: true,
            compensation: true,
            resolvedAt: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 1,
    },
} as const;

export const createReportForRenter = ({
    contractId,
    description,
    priority,
    propertyId,
    title,
    type,
    ownerId,
    renterId,
    ...data
}: ICreateReportForRenterRequest) => {
    return prisma.report.create({
        data: {
            contractId,
            description,
            priority,
            propertyId,
            title,
            type,
            ownerId,
            renterId,
            reportChild: {
                create: {
                    ...data,
                    status: 'pending_owner',
                },
            },
            history: {
                create: {
                    status: 'pending_owner',
                },
            },
        },
        select: {
            id: true,
            title: true,
            priority: true,
            type: true,
            createdAt: true,
            ownerId: true,
            renterId: true,
            contractId: true,
            reportChild: {
                select: {
                    id: true,
                    status: true,
                    proposed: true,
                    compensation: true,
                    resolvedAt: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: 1,
            },
        },
    });
};

export const findReportByIdAndOwnerId = (id: ReportId, ownerId: IUserId) => {
    return prisma.report.findFirst({
        where: {
            id,
            ownerId,
        },
    });
};

export const findReportsAndLastChild = ({ isAdmin, userId, contractId }: IFindReportsAndLastChild) => {
    return prisma.report.findMany({
        where: {
            ...(!isAdmin && {
                OR: [
                    {
                        ownerId: userId,
                    },
                    {
                        renterId: userId,
                    },
                ],
            }),
            ...(contractId && { contractId }),
        },
        select: reportsSelect,
        orderBy: {
            createdAt: 'desc',
        },
    });
};

export const getReportDetailById = ({ id, isAdmin, userId }: { id: ReportId; isAdmin: boolean; userId: IUserId }) => {
    return prisma.report.findFirst({
        where: {
            id,
            ...(!isAdmin && {
                OR: [
                    {
                        ownerId: userId,
                    },
                    {
                        renterId: userId,
                    },
                ],
            }),
        },
        include: {
            owner: {
                select: {
                    userId: true,
                    name: true,
                },
            },
            renter: {
                select: {
                    userId: true,
                    name: true,
                },
            },
            reportChild: {
                orderBy: {
                    createdAt: 'asc',
                },
            },
            history: {
                orderBy: {
                    createdAt: 'desc',
                },
            },
        },
    });
};

export const getReportByRenter = ({ renterId, priority, type }: IGetReportByRenterId) => {
    return prisma.report.findMany({
        where: {
            renterId,
            ...(priority && { priority }),
            ...(type && { type }),
        },
        orderBy: {
            createdAt: 'desc',
        },
        select: reportsSelect,
    });
};

export const countReportByRenter = ({ renterId }: IGetReportByRenterId) => {
    return prisma.report.count({
        where: {
            renterId,
        },
    });
};

export const getReportByOwner = ({
    ownerId,
    sort = {
        createdAt: 'desc',
    },
}: IGetReportByOwnerId) => {
    return prisma.report.findMany({
        where: {
            ownerId,
        },
        orderBy: sort,
        select: reportsSelect,
    });
};

export const countReportByOwner = ({ ownerId }: IGetReportByOwnerId) => {
    return prisma.report.count({
        where: {
            ownerId,
        },
    });
};

export const getReportByAdmin = ({ statuses, type }: IGetReportByAdmin) => {
    return prisma.report.findMany({
        where: {
            ...(statuses && {
                reportChild: {
                    some: {
                        status: {
                            in: statuses,
                        },
                    },
                },
            }),
            ...(type && { type }),
        },
        orderBy: {
            createdAt: 'desc',
        },
        select: reportsSelect,
    });
};

export const countReportByAdmin = ({ statuses, type }: IGetReportByAdmin) => {
    return prisma.report.count({
        where: {
            ...(statuses && {
                reportChild: {
                    some: {
                        status: {
                            in: statuses,
                        },
                    },
                },
            }),
            ...(type && { type }),
        },
    });
};
