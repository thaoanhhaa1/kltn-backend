import { ContractCancellationRequestStatus } from '@prisma/client';
import { ICancellationRequest } from '../interfaces/contractCancellationRequest';
import prisma from '../prisma/prismaClient';
import { findContractById, findContractByIdAndUser, updateStatusContract } from '../repositories/contract.repository';
import {
    createCancellationRequest,
    getCancelRequestByContractId,
    getCancelRequestById,
    updateCancelRequestStatus,
} from '../repositories/contractCancellationRequest.repository';
import { findByContractAndRented } from '../repositories/transaction.repository';
import { CreateContractCancellationRequest } from '../schemas/contractCancellationRequest.schema';
import { convertDateToDB } from '../utils/convertDate';
import CustomError from '../utils/error.util';
import getContractStatusByCancelStatus from '../utils/getContractStatusByCancelStatus.util';

const getTextByStatus = (status: ContractCancellationRequestStatus) => {
    switch (status) {
        case 'REJECTED':
            return 'từ chối';
        case 'CONTINUE':
            return 'tiếp tục';
        case 'APPROVED':
            return 'chấp nhận';
        case 'UNILATERAL_CANCELLATION':
            return 'đơn phương chấm dứt';
        default:
            return '';
    }
};

export const createCancellationRequestService = async (params: CreateContractCancellationRequest) => {
    const [contract, request] = await Promise.all([
        findContractByIdAndUser({
            contractId: params.contractId,
            userId: params.requestedBy,
        }),
        getCancelRequestByContractId(params.contractId),
    ]);

    if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');

    if (request) {
        if (request.status === 'APPROVED') throw new CustomError(400, 'Yêu cầu huỷ hợp đồng đã được chấp nhận');
        if (request.status === 'PENDING') throw new CustomError(400, 'Yêu cầu huỷ hợp đồng đang chờ xác nhận');
        if (request.status === 'UNILATERAL_CANCELLATION') {
            if (request.requestedBy === contract.renter_user_id)
                throw new CustomError(400, 'Người thuê nhà đã đơn phương chấm dứt hợp đồng');
            throw new CustomError(400, 'Người cho thuê nhà đã đơn phương chấm dứt hợp đồng');
        }
        if (request.status === 'REJECTED') throw new CustomError(400, 'Yêu cầu huỷ hợp đồng đã bị từ chối');
    }

    if (contract.status === 'WAITING') throw new CustomError(400, 'Hợp đồng đang chờ xác nhận');
    if (contract.status === 'ENDED') throw new CustomError(400, 'Hợp đồng đã kết thúc');
    if (contract.status === 'OVERDUE') throw new CustomError(400, 'Hợp đồng đã quá hạn');
    if (contract.status === 'CANCELLED') throw new CustomError(400, 'Hợp đồng đã bị hủy');
    if (contract.status === 'UNILATERAL_CANCELLATION') throw new CustomError(400, 'Hợp đồng đã bị hủy một phía');
    if (contract.status === 'APPROVED_CANCELLATION') throw new CustomError(400, 'Hợp đồng đã được hủy');

    const [cancelRequest, contractNew] = await prisma.$transaction([
        createCancellationRequest({
            ...params,
            cancelDate: convertDateToDB(params.cancelDate),
        }),
        updateStatusContract(
            params.contractId,
            getContractStatusByCancelStatus({
                status: 'PENDING',
            }),
        ),
    ]);

    return {
        request: cancelRequest,
        contract: contractNew,
    };
};

export const updateStatusRequestService = async ({ requestId, userId, status }: ICancellationRequest) => {
    const request = await getCancelRequestById(requestId);

    if (!request) throw new CustomError(404, 'Yêu cầu huỷ hợp đồng không tồn tại');

    const [contract, isRented] = await Promise.all([
        userId
            ? findContractByIdAndUser({
                  contractId: request.contractId,
                  userId,
              })
            : findContractById(request.contractId),
        findByContractAndRented(request.contractId),
    ]);

    if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');

    if (contract.status === 'WAITING') throw new CustomError(400, 'Hợp đồng đang chờ xác nhận');
    if (contract.status === 'ENDED') throw new CustomError(400, 'Hợp đồng đã kết thúc');
    if (contract.status === 'OVERDUE') throw new CustomError(400, 'Hợp đồng đã quá hạn');
    if (contract.status === 'CANCELLED') throw new CustomError(400, 'Hợp đồng đã bị hủy');
    if (contract.status === 'UNILATERAL_CANCELLATION') throw new CustomError(400, 'Hợp đồng đã bị hủy một phía');
    if (contract.status === 'APPROVED_CANCELLATION') throw new CustomError(400, 'Hợp đồng đã được hủy');
    if (request.status === 'APPROVED') throw new CustomError(400, 'Yêu cầu huỷ hợp đồng đã được chấp nhận');
    if (request.status === 'CANCELLED') throw new CustomError(400, 'Yêu cầu huỷ hợp đồng đã bị hủy');
    if (request.status === 'CONTINUE') throw new CustomError(400, 'Hợp đồng vẫn tiếp tục được thực hiện');
    if (request.status === 'UNILATERAL_CANCELLATION') throw new CustomError(400, 'Hợp đồng đã bị hủy một phía');

    if (status === 'REJECTED') {
        if (request.status === 'REJECTED') throw new CustomError(400, 'Yêu cầu huỷ hợp đồng đã bị từ chối');
    } else if (status === 'CONTINUE') {
        if (request.status === 'PENDING') throw new CustomError(400, 'Yêu cầu huỷ hợp đồng đang chờ xác nhận');
    } else if (status === 'APPROVED') {
        if (request.status === 'REJECTED') throw new CustomError(400, 'Yêu cầu huỷ hợp đồng đã bị từ chối');
    } else if (status === 'UNILATERAL_CANCELLATION') {
        if (request.status === 'PENDING') throw new CustomError(400, 'Yêu cầu huỷ hợp đồng đang chờ xác nhận');
    }

    const isByRequestOwner = request.requestedBy === userId;
    if (['REJECTED', 'APPROVED'].includes(status) && userId && isByRequestOwner)
        throw new CustomError(400, `Bạn không thể ${getTextByStatus(status)} yêu cầu của mình`);
    if (['CONTINUE', 'UNILATERAL_CANCELLATION'].includes(status) && userId && !isByRequestOwner)
        throw new CustomError(400, `Bạn không thể ${getTextByStatus(status)} yêu cầu của người khác`);

    if (['REJECTED', 'CONTINUE', 'APPROVED', 'UNILATERAL_CANCELLATION'].includes(status)) {
        const [cancelRequest, contract] = await prisma.$transaction([
            updateCancelRequestStatus(requestId, status),
            updateStatusContract(
                request.contractId,
                getContractStatusByCancelStatus({
                    status,
                    isRented: !!isRented,
                }),
            ),
        ]);

        return {
            request: cancelRequest,
            contract,
        };
    }

    throw new CustomError(400, 'Trạng thái không hợp lệ');
};
