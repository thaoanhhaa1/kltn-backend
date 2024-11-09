import { ICreateReportForRenterRequest, ReportId } from '../interfaces/report';
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
            reportChild: true,
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
