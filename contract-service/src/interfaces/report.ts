import { Report, ReportChild, ReportPriority } from '@prisma/client';
import { CreateReportForRenterRequest } from '../schemas/report.schema';
import { IContractId } from './contract';
import { IUserId } from './user';

export type ReportId = Report['id'];
export type ReportChildId = ReportChild['id'];

export type ICreateReportForRenterRequest = CreateReportForRenterRequest & {
    renterId: string;
    priority: ReportPriority;
    propertyId: string;
    ownerId: string;
};

export type ICreateReportForRenter = Pick<
    ICreateReportForRenterRequest,
    'propertyId' | 'contractId' | 'ownerId' | 'renterId' | 'type' | 'priority' | 'title' | 'description'
>;

export type ICreateReportChildForRenter = Pick<
    ICreateReportForRenterRequest,
    'proposed' | 'evidences' | 'compensation'
> & {
    reportId: Report['id'];
};

export type IFindReportsAndLastChild = {
    userId?: IUserId;
    isAdmin?: boolean;
    contractId?: IContractId;
};
