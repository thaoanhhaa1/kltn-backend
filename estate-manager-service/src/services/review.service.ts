import { v4 } from 'uuid';
import elasticClient from '../configs/elastic.config';
import { DeleteReviewService, UpdateReview } from '../interface/review';
import { IUserId } from '../interface/user';
import { getPropertyById, getRating, updateRating } from '../repositories/property.repository';
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
import { IUpdateRating } from './../interface/property';
import { getContractByIdService } from './contract.service';
import { createNotificationService } from './notification.service';

const updateRatingPromise = ({ count, propertyId, rating }: IUpdateRating) =>
    Promise.all([
        updateRating({
            propertyId,
            rating,
            count,
        }),
        elasticClient.updateByQuery({
            index: 'properties',
            body: {
                script: {
                    source: `ctx._source.rating = ${rating}; ctx._source.ratingCount = ${count}`,
                },
                query: {
                    term: {
                        _id: propertyId,
                    },
                },
            },
        }),
    ]);

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

    let result;

    if (reviewFind) {
        result = await replyReview(reviewFind.id, {
            content: review.content,
            medias: review.medias,
            rating: review.rating,
            id: v4(),
            userId,
        });
    } else
        result = await createReview({
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

    if (!reviewFind)
        getRating(review.propertyId)
            .then((property) => {
                if (!property) return;

                const count = property.ratingCount || 0;
                const newRating = (property.rating * count + review.rating) / (count + 1);
                console.log('🚀 ~ .then ~ newRating:', newRating);
                const newRatingCount = count + 1;
                console.log('🚀 ~ .then ~ newRatingCount:', newRatingCount);

                return updateRatingPromise({
                    count: newRatingCount,
                    propertyId: review.propertyId,
                    rating: newRating,
                });
            })
            .then(() => console.log('Update rating success'))
            .catch((err) => console.log(err));

    createNotificationService({
        title: 'Đánh giá mới',
        body: `Bạn vừa nhận được một đánh giá mới từ **${contract.renter.name}** cho hợp đồng **${contract.contractId}**`,
        type: 'REVIEW',
        docId: result.contractId,
        from: userId,
        to: property.owner.userId === userId ? contract.renter.userId : property.owner.userId,
    })
        .then(() => console.log('Create notification success'))
        .catch((err) => console.log(err));

    return result;
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

    const result = await deleteReviewById({ id, userId });

    getRating(result.propertyId)
        .then((property) => {
            if (!property) return;

            const count = property.ratingCount || 0;
            const newRating = count === 1 ? 0 : (property.rating * count - result.rating) / (count - 1);
            const newRatingCount = count - 1;

            return updateRatingPromise({
                count: newRatingCount,
                propertyId: result.propertyId,
                rating: newRating,
            });
        })
        .then(() => console.log('Update rating success'))
        .catch((err) => console.log(err));

    return result;
};
