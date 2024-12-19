import { Report, ReportChild, ReportPriority, ReportStatus, ReportType } from '@prisma/client';
import { CreateReportForRenterRequest } from '../schemas/report.schema';
import { IContractId } from './contract';
import { IPagination } from './pagination';
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

export type IGetReportByRenterId = IPagination & {
    renterId: string;
    type?: ReportType;
    priority?: ReportPriority;
    status?: ReportStatus;
    fromDate?: string;
    toDate?: string;
};

export type IGetReportByRenterReq = IGetReportByRenterId;

export type IGetReportByOwnerId = IPagination & {
    ownerId: string;
    statuses?: ReportStatus[];
    sort?: Object;
    contractId?: string;
    renterId?: string;
    title?: string;
    type?: ReportType;
    priority?: string;
    resolvedAt?: string;
};

export type IGetReportByOwnerReq = Omit<IGetReportByOwnerId, 'sort' | 'statuses'> & {
    status: ReportFilterStatus;
    sort: ReportSort;
    contractId?: string;
    renterId?: string;
    title?: string;
    type?: ReportType;
    priority?: string;
    resolvedAt?: string;
};

export type IGetReportByAdmin = IPagination & {
    statuses?: ReportStatus[];
    type?: ReportType;
};

export type IGetReportByAdminReq = Omit<IGetReportByAdmin, 'statuses'> & {
    status: ReportFilterStatus;
};

export type ReportFilterStatus = 'pending' | 'resolved' | 'urgent' | 'all';
export type ReportSort = 'newest' | 'priority_asc' | 'priority_desc' | 'all';

export type IReportDTO = Report &
    ReportChild & {
        reportChildId: ReportChildId;
    };
