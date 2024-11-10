import { ReportStatus } from '@prisma/client';
import { ReportId } from '../interfaces/report';
import prisma from '../prisma/prismaClient';

export const createReportHistory = (reportId: ReportId, status: ReportStatus) => {
    return prisma.reportHistory.create({
        data: {
            reportId,
            status,
        },
    });
};
