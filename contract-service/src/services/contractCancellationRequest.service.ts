import { ContractCancellationRequestStatus } from '@prisma/client';
import { isSameDay } from 'date-fns';
import { IContractId } from '../interfaces/contract';
import { ICancellationRequest } from '../interfaces/contractCancellationRequest';
import { IUserId } from '../interfaces/user';
import prisma from '../prisma/prismaClient';
import { findContractById, findContractByIdAndUser, updateStatusContract } from '../repositories/contract.repository';
import {
    createCancellationRequest,
    getCancelRequestByContractId,
    getCancelRequestById,
    getHandledCancelRequestByContractId,
    getNotHandledCancelRequestByContractId,
    updateCancelRequestStatus,
} from '../repositories/contractCancellationRequest.repository';
import { findByContractAndRented } from '../repositories/transaction.repository';
import { findUserById } from '../repositories/user.repository';
import { CreateContractCancellationRequest } from '../schemas/contractCancellationRequest.schema';
import { convertDateToDB } from '../utils/convertDate';
import CustomError from '../utils/error.util';
import getContractStatusByCancelStatus from '../utils/getContractStatusByCancelStatus.util';
import { convertGasToEthService, transferToSmartContractService } from './blockchain.service';
import { getCoinPriceService } from './coingecko.service';
import { endContractService } from './contract.service';
import { createTransactionService } from './transaction.service';

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
            if (request.requestedBy === contract.renterId)
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

    const [contract, isRented, user] = await Promise.all([
        userId
            ? findContractByIdAndUser({
                  contractId: request.contractId,
                  userId,
              })
            : findContractById(request.contractId),
        findByContractAndRented(request.contractId),
        userId ? findUserById(userId) : Promise.resolve(null),
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
        if (!user?.walletAddress) throw new CustomError(400, 'Người dùng chưa kết nối ví');

        // is owner
        if (request.requestedBy === contract.ownerId) {
            const ethVnd = await getCoinPriceService();
            const receipt = await transferToSmartContractService({
                amount: contract.monthlyRent,
                senderAddress: user.walletAddress,
            });

            const feeEth = Number(await convertGasToEthService(Number(receipt.gasUsed)));
            const fee = feeEth * ethVnd;

            createTransactionService({
                amount: contract.monthlyRent,
                contractId: contract.contractId,
                status: 'COMPLETED',
                title: 'Bồi thường tiền huỷ hợp đồng',
                type: 'COMPENSATION',
                amountEth: contract.monthlyRent / ethVnd,
                description: `Bồi thường tiền huỷ hợp đồng cho hợp đồng **${contract.contractId}**`,
                fee,
                feeEth,
                fromId: contract.ownerId,
                transactionHash: receipt.transactionHash,
            })
                .then(() => console.log('Transaction created successfully'))
                .catch((error) => console.error('Error creating transaction:', error));
        }
    }

    const isByRequestOwner = request.requestedBy === userId;
    if (['REJECTED', 'APPROVED'].includes(status) && userId && isByRequestOwner)
        throw new CustomError(400, `Bạn không thể ${getTextByStatus(status)} yêu cầu của mình`);
    if (['CONTINUE', 'UNILATERAL_CANCELLATION'].includes(status) && userId && !isByRequestOwner)
        throw new CustomError(400, `Bạn không thể ${getTextByStatus(status)} yêu cầu của người khác`);

    if (['REJECTED', 'CONTINUE', 'APPROVED', 'UNILATERAL_CANCELLATION'].includes(status)) {
        const queries = [
            updateCancelRequestStatus(requestId, status),
            updateStatusContract(
                request.contractId,
                getContractStatusByCancelStatus({
                    status,
                    isRented: !!isRented,
                }),
                ['APPROVED', 'UNILATERAL_CANCELLATION'].includes(status) ? request.cancelDate : undefined,
            ),
        ];

        const [cancelRequest, contract] = await prisma.$transaction(queries);

        if (
            (status === 'APPROVED' || status === 'UNILATERAL_CANCELLATION') &&
            isSameDay(request.cancelDate, new Date())
        ) {
            const contract = await endContractService({
                contractId: request.contractId,
                id: requestId,
            });

            return {
                request: cancelRequest,
                contract,
            };
        }

        return {
            request: cancelRequest,
            contract,
        };
    }

    throw new CustomError(400, 'Trạng thái không hợp lệ');
};

export const getHandledCancelRequestByContractIdService = async ({
    contractId,
    userId,
}: {
    contractId: IContractId;
    userId: IUserId;
}) => {
    try {
        const [requests, contract] = await Promise.all([
            getHandledCancelRequestByContractId(contractId),
            findContractById(contractId),
        ]);

        if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');
        if (contract.ownerId !== userId && contract.renterId !== userId)
            throw new CustomError(403, 'Không có quyền truy cập hợp đồng');

        return requests;
    } catch (error) {
        console.error('Error getting handled cancel requests by contract id:', error);
        throw error;
    }
};

export const getNotHandledCancelRequestByContractIdService = async ({
    contractId,
    userId,
}: {
    contractId: IContractId;
    userId: IUserId;
}) => {
    try {
        const [request, contract] = await Promise.all([
            getNotHandledCancelRequestByContractId(contractId),
            findContractById(contractId),
        ]);

        if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');
        if (contract.ownerId !== userId && contract.renterId !== userId)
            throw new CustomError(403, 'Không có quyền truy cập hợp đồng');

        return request;
    } catch (error) {
        console.error('Error getting not handled cancel request by contract id:', error);
        throw error;
    }
};
