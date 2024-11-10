import { ICreateReportForRenterRequest, IFindReportsAndLastChild, ReportId } from '../interfaces/report';
import { IUserId } from '../interfaces/user';
import prisma from '../prisma/prismaClient';

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
