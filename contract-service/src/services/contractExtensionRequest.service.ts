import { isAfter } from 'date-fns';
import { IContractId } from '../interfaces/contract';
import { IUpdateContractExtensionRequestStatus } from '../interfaces/contractExtensionRequest.interface';
import prisma from '../prisma/prismaClient';
import { findContractById, updateEndDateActual } from '../repositories/contract.repository';
import {
    createContractExtensionRequest,
    findContractExtensionRequestById,
    getContractExtensionRequestByContractId,
    getContractExtensionRequestPendingByContractId,
    updateContractExtensionRequest,
    updateContractExtensionRequestStatus,
} from '../repositories/contractExtensionRequest.repository';
import { getTransactionById, updateEndDate } from '../repositories/transaction.repository';
import { findUserById } from '../repositories/user.repository';
import { ICreateContractExtensionRequest } from '../schemas/contractExtensionRequest.schema';
import { convertDateToDB } from '../utils/convertDate';
import CustomError from '../utils/error.util';
import { createNotificationQueue } from './rabbitmq.service';

export const createContractExtensionRequestService = async ({ userId, ...rest }: ICreateContractExtensionRequest) => {
    const [extensionRequest, user, contract, transaction] = await Promise.all([
        getContractExtensionRequestPendingByContractId(rest.contractId, rest.type),
        findUserById(userId),
        findContractById(rest.contractId),
        rest.transactionId ? getTransactionById(rest.transactionId) : Promise.resolve(null),
    ]);

    if (!user) throw new CustomError(400, 'Người dùng không tồn tại');
    if (!contract) throw new CustomError(400, 'Hợp đồng không tồn tại');
    if (contract.renterId !== userId) throw new CustomError(400, 'Người dùng không có quyền thực hiện hành động này');
    if (transaction && transaction.status !== 'PENDING')
        throw new CustomError(400, 'Giao dịch không tồn tại hoặc đã được xử lý');
    if (transaction && transaction.endDate) {
        if (isAfter(new Date(transaction.endDate), new Date(rest.extensionDate)))
            throw new CustomError(400, 'Ngày gia hạn phải sau ngày kết thúc thanh toán');
    } else {
        if (isAfter(new Date(contract.endDate), new Date(rest.extensionDate)))
            throw new CustomError(400, 'Ngày gia hạn phải sau ngày kết thúc hợp đồng');
    }
    if (!transaction && !['DEPOSITED', 'ONGOING'].includes(contract.status))
        throw new CustomError(400, 'Chỉ có thể yêu cầu gia hạn khi hợp đồng đang diễn ra hoặc đã đặt cọc');

    if (extensionRequest)
        return updateContractExtensionRequest(extensionRequest.id, {
            ...rest,
            extensionDate: convertDateToDB(rest.extensionDate.split('-').reverse().join('/')),
            date: transaction?.endDate || contract.endDate,
        });

    const result = await createContractExtensionRequest({
        ...rest,
        extensionDate: convertDateToDB(rest.extensionDate),
        date: transaction?.endDate || contract.endDate,
    });

    createNotificationQueue({
        title: rest.type === 'EXTEND_CONTRACT' ? 'Yêu cầu gia hạn hợp đồng' : 'Yêu cầu gia hạn thanh toán',
        body:
            rest.type === 'EXTEND_CONTRACT'
                ? `Người thuê **${user.name}** đã gửi yêu cầu gia hạn hợp đồng **${contract.contractId}**`
                : `Người thuê **${user.name}** đã gửi yêu cầu gia hạn hoá đơn thanh toán **${transaction?.id || ''}**`,
        type: 'CONTRACT_DETAIL',
        docId: contract.contractId,
        from: userId,
        to: contract.ownerId,
    })
        .then(() => console.log('Create notification success'))
        .catch(console.error);

    return result;
};

export const updateContractExtensionRequestStatusService = async ({
    id,
    status,
    userId,
    contractId,
}: IUpdateContractExtensionRequestStatus) => {
    if (status === 'PENDING')
        throw new CustomError(400, 'Không thể cập nhật trạng thái yêu cầu gia hạn thành chờ xử lý');

    const [request, contract] = await Promise.all([findContractExtensionRequestById(id), findContractById(contractId)]);

    if (!request) throw new CustomError(400, 'Yêu cầu gia hạn không tồn tại');
    if (request.status !== 'PENDING') throw new CustomError(400, 'Yêu cầu gia hạn đã được xử lý');
    if (!contract) throw new CustomError(400, 'Hợp đồng không tồn tại');
    if (contract.renterId !== userId && contract.ownerId !== userId)
        throw new CustomError(400, 'Người dùng không có quyền thực hiện hành động này');

    if (contract.renterId === userId && ['REJECTED', 'APPROVED'].includes(status))
        throw new CustomError(400, 'Người thuê không thể duyệt yêu cầu gia hạn');
    if (contract.ownerId === userId && status === 'CANCELLED')
        throw new CustomError(400, 'Người cho thuê không thể hủy yêu cầu gia hạn');

    const queries: any[] = [updateContractExtensionRequestStatus(id, status)];

    if (status === 'APPROVED') {
        if (request.transactionId) queries.push(updateEndDate(request.transactionId, request.extensionDate));
        else queries.push(updateEndDateActual(contractId, request.extensionDate));
    }

    const [result] = await prisma.$transaction(queries);

    if (status === 'CANCELLED')
        createNotificationQueue({
            title: 'Yêu cầu gia hạn hợp đồng đã bị hủy',
            body: `Yêu cầu gia hạn hợp đồng **${contract.contractId}** đã bị hủy`,
            type: 'CONTRACT_DETAIL',
            docId: contract.contractId,
            from: userId,
            to: contract.renterId,
        })
            .then(() => console.log('Create notification success'))
            .catch(console.error);
    else
        createNotificationQueue({
            title:
                status === 'APPROVED'
                    ? 'Yêu cầu gia hạn hợp đồng đã được chấp nhận'
                    : 'Yêu cầu gia hạn hợp đồng đã bị từ chối',
            body:
                status === 'APPROVED'
                    ? `Yêu cầu gia hạn hợp đồng **${contract.contractId}** đã được chấp nhận`
                    : `Yêu cầu gia hạn hợp đồng **${contract.contractId}** đã bị từ chối`,
            type: 'CONTRACT_DETAIL',
            docId: contract.contractId,
            from: userId,
            to: contract.renterId,
        })
            .then(() => console.log('Create notification success'))
            .catch(console.error);

    return result;
};

export const getContractExtensionRequestByContractIdService = (contractId: IContractId) => {
    return getContractExtensionRequestByContractId(contractId);
};
