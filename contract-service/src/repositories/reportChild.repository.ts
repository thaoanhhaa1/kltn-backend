import { ReportStatus } from '@prisma/client';
import { ReportChildId, ReportId } from '../interfaces/report';
import prisma from '../prisma/prismaClient';
import { CreateReportChildRequest } from '../schemas/report.schema';

export const updateReportChildStatus = (id: ReportChildId, status: ReportStatus) => {
    return prisma.reportChild.update({
        where: { id },
        data: { status },
    });
};

export const getLastReportChildByReportId = (reportId: ReportId) => {
    return prisma.reportChild.findFirst({
        where: {
            reportId,
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const createReportChild = (
    data: Omit<CreateReportChildRequest, 'ownerId'>,
    status: ReportStatus = 'pending_renter',
) => {
    return prisma.reportChild.create({
        data: {
            ...data,
            status,
        },
    });
};

export const findReportChildById = (id: ReportChildId) => {
    return prisma.reportChild.findFirst({
        where: {
            id,
        },
        include: {
            report: {
                select: {
                    ownerId: true,
                    renterId: true,
                    title: true,
                    contractId: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const getLastReportChildByReportIdAndRenterReject = (reportId: ReportId) => {
    return prisma.reportChild.findFirst({
        where: {
            reportId,
            status: 'renter_rejected',
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const getLastReportChildByReportIdAndOwnerProposed = (reportId: ReportId) => {
    return prisma.reportChild.findFirst({
        where: {
            reportId,
            status: 'owner_proposed',
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const updateReportChildWhenOwnerComplete = (id: ReportChildId, transactionId: number) => {
    return prisma.reportChild.update({
        where: { id },
        data: {
            transactionId,
            status: 'owner_completed',
        },
    });
};
