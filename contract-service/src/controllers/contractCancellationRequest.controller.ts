import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { createContractCancellationRequestSchema } from '../schemas/contractCancellationRequest.schema';
import { getContractByIdService } from '../services/contract.service';
import {
    createCancellationRequestService,
    getCancelRequestByOwnerService,
    getHandledCancelRequestByContractIdService,
    getNotHandledCancelRequestByContractIdService,
    updateStatusRequestService,
} from '../services/contractCancellationRequest.service';
import { createNotificationQueue } from '../services/rabbitmq.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';
import CustomError from '../utils/error.util';
import getCancelRequestStatusText from '../utils/getCancelRequestStatusText';
import getOtherUserInContract from '../utils/getOtherUserInContract';

export const createCancellationRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const safeParser = createContractCancellationRequestSchema.safeParse({
            ...req.body,
            requestedBy: userId,
        });

        if (!safeParser.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParser.error.issues,
                message: 'Dữ liệu không hợp lệ',
                status: 400,
            });

        const result = await createCancellationRequestService(safeParser.data);

        const { otherUser, user } = getOtherUserInContract({
            myId: userId,
            owner: result.contract.owner,
            renter: result.contract.renter,
        });

        createNotificationQueue({
            body: `**${user.name}** đã gửi yêu cầu huỷ hợp đồng **${result.contract.contractId}**`,
            title: 'Yêu cầu huỷ hợp đồng',
            type: 'CONTRACT_DETAIL',
            docId: result.contract.contractId,
            from: userId,
            to: otherUser.userId,
        })
            .then(() => console.log('Notification sent'))
            .catch((err) => console.log(err));

        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

export const updateCancellationRequestStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const requestId = Number(req.params.requestId);
        const { status } = req.body;

        if (!Number.isInteger(requestId)) throw new CustomError(400, 'Mã yêu cầu không hợp lệ');
        if (!status) throw new CustomError(400, 'Trạng thái không được để trống');

        const request = await updateStatusRequestService({ requestId, userId, status });

        // 'REJECTED', 'CONTINUE', 'APPROVED', 'UNILATERAL_CANCELLATION'
        getContractByIdService({
            contractId: request.request.contractId,
            userId,
        })
            .then((contract) => {
                if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');

                return contract;
            })
            .then((contract) => {
                const { otherUser } = getOtherUserInContract({
                    myId: userId,
                    owner: contract.owner,
                    renter: contract.renter,
                });

                return createNotificationQueue({
                    body: `Yêu cầu huỷ hợp đồng **${
                        request.request.contractId
                    }** đã được **${getCancelRequestStatusText(status).toLowerCase()}**`,
                    title: 'Yêu cầu huỷ hợp đồng',
                    type: 'CONTRACT_DETAIL',
                    docId: request.request.contractId,
                    from: userId,
                    to: otherUser.userId,
                });
            })
            .then(() => console.log('Notification sent'))
            .catch((err) => console.log(err));

        res.json(request);
    } catch (error) {
        next(error);
    }
};

export const getHandledCancelRequestByContractId = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user!.id;
        const contractId = req.params.contractId;

        if (!contractId) throw new CustomError(400, 'Mã hợp đồng không được để trống');

        return res.json(await getHandledCancelRequestByContractIdService({ contractId, userId }));
    } catch (error) {
        next(error);
    }
};

export const getNotHandledCancelRequestByContractId = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user!.id;
        const contractId = req.params.contractId;

        if (!contractId) throw new CustomError(400, 'Mã hợp đồng không được để trống');

        return res.json(await getNotHandledCancelRequestByContractIdService({ contractId, userId }));
    } catch (error) {
        next(error);
    }
};

export const getCancelRequestByOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const take = Number(req.query.take) || 10;
        const skip = Number(req.query.skip) || 0;

        const result = await getCancelRequestByOwnerService({
            userId,
            pagination: {
                skip,
                take,
            },
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
};
