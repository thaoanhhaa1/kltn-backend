import { v4 } from 'uuid';
import { DeleteReviewService, UpdateReview } from '../interface/review';
import { IUserId } from '../interface/user';
import { getPropertyById } from '../repositories/property.repository';
import {
    createReview,
    deleteReplyReviewById,
    deleteReviewById,
    getReviewsByContractId,
    getReviewsBySlug,
    replyReview,
    updateReplyReviewById,
    updateReviewById,
} from '../repositories/review.repository';
import { CreateReviewRequest } from '../schemas/review.schema';
import CustomError from '../utils/error.util';
import { getContractByIdService } from './contract.service';

export const createReviewService = async (userId: IUserId, review: CreateReviewRequest) => {
    const [property, contract, reviewFind] = await Promise.all([
        getPropertyById(review.propertyId),
        getContractByIdService({
            contractId: review.contractId,
            userId,
        }),
        getReviewsByContractId(review.contractId),
    ]);

    if (!property) throw new CustomError(404, 'Không tìm thấy bất động sản');
    if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');
    if (!['ENDED', 'CANCELLED'].includes(contract.status)) throw new CustomError(400, 'Hợp đồng chưa kết thúc');
    if (contract.renter.userId !== userId && contract.owner.userId !== userId)
        throw new CustomError(403, 'Không có quyền thực hiện hành động này');

    if (!reviewFind && contract.owner.userId === userId)
        throw new CustomError(400, 'Chỉ người thuê mới có thể đánh giá');

    if (reviewFind) {
        const reply = await replyReview(reviewFind.id, {
            content: review.content,
            medias: review.medias,
            rating: review.rating,
            id: v4(),
            userId,
        });

        return reply;
    }

    const reviewResult = await createReview({
        ...review,
        slug: property.slug,
        renter: {
            userId,
            name: contract.renter.name,
            avatar: contract.renter.avatar,
        },
        owner: {
            userId: property.owner.userId,
            name: property.owner.name,
            avatar: property.owner.avatar,
        },
    });

    return reviewResult;
};

export const getReviewByIdService = async () => {};

export const getReviewsByContractIdService = async (contractId: string, userId: IUserId) => {
    const contract = await getContractByIdService({
        contractId,
        userId,
    });

    if (!contract) throw new CustomError(404, 'Không tìm thấy hợp đồng');
    if (contract.renter.userId !== userId && contract.owner.userId !== userId)
        throw new CustomError(403, 'Không có quyền thực hiện hành động này');

    return getReviewsByContractId(contractId);
};

export const getReviewsBySlugService = async (slug: string) => {
    return getReviewsBySlug(slug);
};

export const updateReviewByIdService = async ({ data, id, userId, replyId }: UpdateReview) => {
    if (replyId)
        return updateReplyReviewById({
            data,
            id,
            replyId,
            userId,
        });

    return updateReviewById({
        data,
        id,
        userId,
    });
};

export const deleteReviewByIdService = async ({ id, userId, replyId }: DeleteReviewService) => {
    if (replyId) return deleteReplyReviewById({ id, replyId, userId });

    return deleteReviewById({ id, userId });
};
