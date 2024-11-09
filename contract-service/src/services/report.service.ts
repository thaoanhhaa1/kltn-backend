import { ReportChildId, ReportId } from '../interfaces/report';
import { IUserId } from '../interfaces/user';
import prisma from '../prisma/prismaClient';
import { findContractById } from '../repositories/contract.repository';
import { createReportForRenter, findReportByIdAndOwnerId } from '../repositories/report.repository';
import {
    createReportChild,
    findReportChildById,
    getLastReportChildByReportId,
    getLastReportChildByReportIdAndOwnerProposed,
    getLastReportChildByReportIdAndRenterReject,
    updateReportChildStatus,
    updateReportChildWhenOwnerComplete,
} from '../repositories/reportChild.repository';
import { createTransaction } from '../repositories/transaction.repository';
import { findUserById } from '../repositories/user.repository';
import {
    AcceptReportByOwnerRequest,
    CreateReportChildRequest,
    CreateReportForRenterRequest,
    ProposedReportChildByOwnerRequest,
    ResolveReportByAdminRequest,
} from '../schemas/report.schema';
import { convertDateToDB } from '../utils/convertDate';
import CustomError from '../utils/error.util';
import { convertGasToEthService, transferAddressToAddressService } from './blockchain.service';
import { getCoinPriceService } from './coingecko.service';
import { createNotificationQueue } from './rabbitmq.service';

export const createReportForRenterService = async (data: CreateReportForRenterRequest) => {
    const contract = await findContractById(data.contractId);

    if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');
    if (contract.renterId !== data.renterId) throw new CustomError(403, 'Không có quyền tạo báo cáo');
    if (['WAITING', 'ENDED', 'OVERDUE', 'CANCELLED'].includes(contract.status))
        throw new CustomError(400, 'Hợp đồng không hợp lệ');

    const report = await createReportForRenter({
        ...data,
        propertyId: contract.propertyId,
        ownerId: contract.ownerId,
        resolvedAt: convertDateToDB(data.resolvedAt),
    });

    createNotificationQueue({
        title: `Báo cáo về **${data.title}**`,
        body: `Người thuê đã tạo báo cáo về **${data.title}** đối với hợp đồng **${contract.contractId}**`,
        type: 'REPORT',
        docId: String(report.id),
        from: data.renterId,
        to: contract.ownerId,
    })
        .then(() => console.log('Notification created'))
        .catch((err) => console.log(err));

    return report;
};

export const acceptReportByOwnerService = async ({ reportId, reportChildId, userId }: AcceptReportByOwnerRequest) => {
    const [report, lastReportChild] = await Promise.all([
        findReportByIdAndOwnerId(reportId, userId),
        getLastReportChildByReportId(reportId),
    ]);

    if (!report) throw new CustomError(404, 'Không tìm thấy báo cáo');
    if (!lastReportChild) throw new CustomError(404, 'Không tìm thấy báo cáo con');
    if (lastReportChild.id !== reportChildId) throw new CustomError(400, 'Báo cáo con không hợp lệ');
    if (lastReportChild.status !== 'pending_owner') throw new CustomError(400, 'Báo cáo đã được xử lý');

    const childReport = await updateReportChildStatus(reportChildId, 'owner_accepted');

    createNotificationQueue({
        title: `Báo cáo về **${report.title}**`,
        body: `Chủ nhà đã chấp nhận báo cáo về **${report.title}** đối với hợp đồng **${report.contractId}**`,
        type: 'REPORT',
        docId: String(report.id),
        from: userId,
        to: report.renterId,
    })
        .then(() => console.log('Notification created'))
        .catch((err) => console.log(err));

    return childReport;
};

export const acceptReportByRenterService = async (reportChildId: ReportChildId, userId: IUserId) => {
    const reportChild = await findReportChildById(reportChildId);

    if (!reportChild) throw new CustomError(404, 'Không tìm thấy báo cáo con');
    if (reportChild.status !== 'pending_renter') throw new CustomError(400, 'Báo cáo không hợp lệ');
    if (reportChild.report.renterId !== userId) throw new CustomError(403, 'Không có quyền xác nhận báo cáo');

    const childReport = await updateReportChildStatus(reportChildId, 'renter_accepted');

    createNotificationQueue({
        title: `Báo cáo về **${reportChild.report.title}**`,
        body: `Người thuê đã chấp nhận đề xuất về **${reportChild.report.title}** đối với hợp đồng **${reportChild.report.contractId}**`,
        type: 'REPORT',
        docId: String(reportChild.reportId),
        from: userId,
        to: reportChild.report.ownerId,
    })
        .then(() => console.log('Notification created'))
        .catch((err) => console.log(err));

    return childReport;
};

export const rejectReportByRenterService = async (reportChildId: ReportChildId, userId: IUserId) => {
    const reportChild = await findReportChildById(reportChildId);

    if (!reportChild) throw new CustomError(404, 'Không tìm thấy báo cáo con');
    if (reportChild.status !== 'pending_renter') throw new CustomError(400, 'Báo cáo không hợp lệ');
    if (reportChild.report.renterId !== userId) throw new CustomError(403, 'Không có quyền xác nhận báo cáo');

    const childReport = await updateReportChildStatus(reportChildId, 'renter_rejected');

    createNotificationQueue({
        title: `Báo cáo về **${reportChild.report.title}**`,
        body: `Người thuê đã từ chối đề xuất về **${reportChild.report.title}** đối với hợp đồng **${reportChild.report.contractId}**`,
        type: 'REPORT',
        docId: String(reportChild.reportId),
        from: userId,
        to: reportChild.report.ownerId,
    })
        .then(() => console.log('Notification created'))
        .catch((err) => console.log(err));
    createNotificationQueue({
        title: `Báo cáo về **${reportChild.report.title}**`,
        body: `Báo cáo **${reportChild.report.title}** của hợp đồng **${reportChild.report.contractId}** cân được giải quyết`,
        type: 'REPORT',
        docId: String(reportChild.reportId),
        toRole: 'admin',
    })
        .then(() => console.log('Notification created'))
        .catch((err) => console.log(err));

    return childReport;
};

export const rejectReportByOwnerService = async (data: CreateReportChildRequest) => {
    const reportChild = await findReportChildById(data.reportId);

    if (!reportChild) throw new CustomError(404, 'Không có báo cáo để phản hồi');
    if (reportChild.status !== 'pending_owner') throw new CustomError(400, 'Báo cáo đã được xử lý');

    const [reportChildRes] = await prisma.$transaction([
        createReportChild({
            ...data,
            resolvedAt: convertDateToDB(data.resolvedAt),
        }),
        updateReportChildStatus(reportChild.id, 'owner_proposed'),
    ]);

    createNotificationQueue({
        title: `Báo cáo về **${reportChild.report.title}**`,
        body: `Chủ nhà đã đề xuất phương án khác cho báo cáo về **${reportChild.report.title}** đối với hợp đồng **${reportChild.report.contractId}**`,
        type: 'REPORT',
        docId: String(reportChild.reportId),
        from: reportChild.report.ownerId,
        to: reportChild.report.renterId,
    })
        .then(() => console.log('Notification created'))
        .catch((err) => console.log(err));

    return reportChildRes;
};

export const cancelReportChildService = async ({
    reportChildId,
    userId,
}: {
    reportChildId: ReportChildId;
    userId: IUserId;
}) => {
    const reportChild = await findReportChildById(reportChildId);

    if (!reportChild) throw new CustomError(404, 'Không tìm thấy báo cáo con');
    if (reportChild.report.ownerId !== userId && reportChild.report.renterId !== userId)
        throw new CustomError(403, 'Không có quyền hủy báo cáo');
    if (reportChild.report.renterId === userId && reportChild.status === 'pending_owner')
        return updateReportChildStatus(reportChildId, 'cancelled');

    throw new CustomError(400, 'Báo cáo đã được xử lý');
};

export const proposedReportChildByOwnerService = async ({
    reportChildId,
    ownerId,
    ...data
}: ProposedReportChildByOwnerRequest) => {
    const reportChild = await findReportChildById(reportChildId);

    if (!reportChild) throw new CustomError(404, 'Không tìm thấy báo cáo con');
    if (reportChild.status !== 'pending_owner') throw new CustomError(400, 'Báo cáo không hợp lệ');
    if (reportChild.report.ownerId !== ownerId) throw new CustomError(403, 'Không có quyền đề xuất báo cáo');

    const [reportChildRes] = await prisma.$transaction([
        createReportChild({
            ...data,
            resolvedAt: convertDateToDB(data.resolvedAt),
            reportId: reportChild.reportId,
        }),
        updateReportChildStatus(reportChildId, 'owner_proposed'),
    ]);

    createNotificationQueue({
        title: `Báo cáo về **${reportChild.report.title}**`,
        body: `Chủ nhà đã đề xuất phương án khác cho báo cáo về **${reportChild.report.title}** đối với hợp đồng **${reportChild.report.contractId}**`,
        type: 'REPORT',
        docId: String(reportChild.reportId),
        from: ownerId,
        to: reportChild.report.renterId,
    })
        .then(() => console.log('Notification created'))
        .catch((err) => console.log(err));

    return reportChildRes;
};

export const resolveReportByAdminService = async ({ choose, reportId, ...data }: ResolveReportByAdminRequest) => {
    const reportChild = await findReportChildById(reportId);

    if (!reportChild) throw new CustomError(404, 'Không tìm thấy báo cáo con');
    if (reportChild.status !== 'renter_rejected') throw new CustomError(400, 'Báo cáo đã được xử lý');

    if (choose === 'admin') {
        if (!data.proposed) throw new CustomError(400, 'Đề xuất là bắt buộc');
        if (!data.resolvedAt) throw new CustomError(400, 'Ngày giải quyết là bắt buộc');

        const reportChildRes = await createReportChild(
            {
                evidences: data.evidences,
                reportId,
                resolvedAt: convertDateToDB(data.resolvedAt),
                compensation: data.compensation,
                proposed: data.proposed,
            },
            'admin_resolved',
        );

        createNotificationQueue({
            title: `Báo cáo về **${reportChild.report.title}**`,
            body: `Báo cáo **${reportChild.report.title}** của hợp đồng **${reportChild.report.contractId}** đã được giải quyết bởi quản trị viên`,
            type: 'REPORT',
            docId: String(reportChild.reportId),
            to: reportChild.report.ownerId,
        })
            .then(() => console.log('Notification created'))
            .catch((err) => console.log(err));
        createNotificationQueue({
            title: `Báo cáo về **${reportChild.report.title}**`,
            body: `Báo cáo **${reportChild.report.title}** của hợp đồng **${reportChild.report.contractId}** đã được giải quyết bởi quản trị viên`,
            type: 'REPORT',
            docId: String(reportChild.reportId),
            to: reportChild.report.renterId,
        })
            .then(() => console.log('Notification created'))
            .catch((err) => console.log(err));

        return reportChildRes;
    }

    const reportChildOfUser = await (choose === 'owner'
        ? getLastReportChildByReportIdAndRenterReject
        : getLastReportChildByReportIdAndOwnerProposed)(reportId);

    if (!reportChildOfUser) throw new CustomError(404, 'Không tìm thấy báo cáo con');

    const reportChildRes = await createReportChild(
        {
            evidences: reportChildOfUser.evidences,
            reportId,
            resolvedAt: convertDateToDB(reportChildOfUser.resolvedAt),
            compensation: reportChildOfUser.compensation || 0,
            proposed: reportChildOfUser.proposed,
        },
        `admin_resolved`,
    );

    createNotificationQueue({
        title: `Báo cáo về **${reportChild.report.title}**`,
        body: `Báo cáo **${reportChild.report.title}** của hợp đồng **${reportChild.report.contractId}** đã được giải quyết bởi quản trị viên`,
        type: 'REPORT',
        docId: String(reportChild.reportId),
        to: reportChild.report.ownerId,
    })
        .then(() => console.log('Notification created'))
        .catch((err) => console.log(err));
    createNotificationQueue({
        title: `Báo cáo về **${reportChild.report.title}**`,
        body: `Báo cáo **${reportChild.report.title}** của hợp đồng **${reportChild.report.contractId}** đã được giải quyết bởi quản trị viên`,
        type: 'REPORT',
        docId: String(reportChild.reportId),
        to: reportChild.report.renterId,
    })
        .then(() => console.log('Notification created'))
        .catch((err) => console.log(err));

    return reportChildRes;
};

export const completeReportByOwnerService = async (reportId: ReportId, userId: IUserId) => {
    const report = await findReportChildById(reportId);

    if (!report) throw new CustomError(404, 'Không tìm thấy báo cáo');
    if (report.status !== 'admin_resolved') throw new CustomError(400, 'Báo cáo không hợp lệ');
    if (report.report.ownerId !== userId) throw new CustomError(403, 'Không có quyền xử lý báo cáo');

    if (report.compensation && report.compensation > 0) {
        const [renter, owner] = await Promise.all([
            findUserById(report.report.renterId),
            findUserById(report.report.ownerId),
        ]);

        if (!renter || !owner) throw new CustomError(404, 'Không tìm thấy người dùng');
        if (!renter.walletAddress || !owner.walletAddress) throw new CustomError(400, 'Người dùng chưa có ví');

        const receipt = await transferAddressToAddressService({
            amount: report.compensation,
            contractId: report.report.contractId,
            description: report.report.title,
            receiverAddress: renter.walletAddress,
            senderAddress: owner.walletAddress,
        });

        const [ethVnd, feeEthRes] = await Promise.all([
            getCoinPriceService(),
            convertGasToEthService(Number(receipt.gasUsed)),
        ]);
        const amountEth = report.compensation / ethVnd;
        const feeEth = Number(feeEthRes);
        const fee = feeEth * ethVnd;

        const transaction = await createTransaction({
            amount: report.compensation,
            amountEth: amountEth,
            fee,
            feeEth,
            status: 'COMPLETED',
            title: report.report.title,
            contractId: report.report.contractId,
            description: report.report.title,
            type: 'REPORT',
            fromId: report.report.ownerId,
            toId: report.report.renterId,
            transactionHash: receipt.transactionHash,
        });

        const reportChild = await updateReportChildWhenOwnerComplete(report.id, transaction.id);

        createNotificationQueue({
            title: `Báo cáo về **${report.report.title}**`,
            body: `Chủ nhà đã giải quyết báo cáo về **${report.report.title}** đối với hợp đồng **${report.report.contractId}**`,
            type: 'REPORT',
            docId: String(report.id),
            from: userId,
            to: report.report.renterId,
        })
            .then(() => console.log('Notification created'))
            .catch((err) => console.log(err));

        return reportChild;
    }

    return updateReportChildStatus(report.id, 'owner_completed');
};

export const completeReportByRenterService = async (reportId: ReportId, userId: IUserId) => {
    const report = await findReportChildById(reportId);

    if (!report) throw new CustomError(404, 'Không tìm thấy báo cáo');
    if (!['admin_resolved', 'owner_completed'].includes(report.status))
        throw new CustomError(400, 'Báo cáo không hợp lệ');
    if (report.report.renterId !== userId) throw new CustomError(403, 'Không có quyền xử lý báo cáo');

    if (report.compensation && report.compensation > 0 && !report.transactionId)
        throw new CustomError(400, 'Chưa có giao dịch bồi thường');

    const reportChild = await updateReportChildStatus(report.id, 'renter_completed');

    createNotificationQueue({
        title: `Báo cáo về **${report.report.title}**`,
        body: `Người thuê đã xác nhận báo cáo về **${report.report.title}** đối với hợp đồng **${report.report.contractId}** đã được giải quyết`,
        type: 'REPORT',
        docId: String(report.id),
        from: userId,
        to: report.report.ownerId,
    })
        .then(() => console.log('Notification created'))
        .catch((err) => console.log(err));

    return reportChild;
};
