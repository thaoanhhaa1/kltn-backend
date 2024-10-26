import { UserBaseEmbed } from '@prisma/client';
import {
    CreateReviewInput,
    DeleteReplyReview,
    DeleteReview,
    ReplyReview,
    ReviewId,
    UpdateReplyReview,
    UpdateReviewById,
} from '../interface/review';
import prisma from '../prisma/prismaClient';

export const updateUserInfoInReview = ({ userId, ...rest }: UserBaseEmbed) => {
    return prisma.review.updateMany({
        where: {
            renter: {
                is: {
                    userId,
                },
            },
        },
        data: {
            renter: {
                update: {
                    ...rest,
                },
            },
        },
    });
};

export const updateOwnerInfoInReview = ({ userId, ...rest }: UserBaseEmbed) => {
    return prisma.review.updateMany({
        where: {
            owner: {
                is: {
                    userId,
                },
            },
        },
        data: {
            owner: {
                update: {
                    ...rest,
                },
            },
        },
    });
};

// create review
export const createReview = (data: CreateReviewInput) => {
    return prisma.review.create({
        data: {
            ...data,
            children: [],
        },
    });
};

export const replyReview = (id: ReviewId, reply: ReplyReview) => {
    return prisma.review.update({
        where: {
            id,
        },
        data: {
            children: {
                push: reply,
            },
        },
    });
};

// get review by id
export const getReviewById = (id: ReviewId) => {
    return prisma.review.findUnique({
        where: {
            id,
        },
    });
};

// get reviews by contract id
export const getReviewsByContractId = (contractId: string) => {
    return prisma.review.findFirst({
        where: {
            contractId,
            deleted: false,
        },
    });
};

// get reviews by property id
export const getReviewsBySlug = (slug: string) => {
    return prisma.review.findMany({
        where: {
            slug,
            deleted: false,
        },
    });
};

// update review by id
export const updateReviewById = ({ data, id, userId }: UpdateReviewById) => {
    return prisma.review.update({
        where: {
            id,
            renter: {
                is: {
                    userId,
                },
            },
            deleted: false,
        },
        data,
    });
};

// update reply review by id
export const updateReplyReviewById = ({ data, id, replyId, userId }: UpdateReplyReview) => {
    return prisma.review.update({
        where: {
            id,
        },
        data: {
            children: {
                updateMany: {
                    where: {
                        id: replyId,
                        userId,
                    },
                    data,
                },
            },
        },
    });
};

// soft delete review by id
export const deleteReviewById = ({ id, userId }: DeleteReview) => {
    return prisma.review.update({
        where: {
            id,
            renter: {
                is: {
                    userId,
                },
            },
        },
        data: {
            deleted: true,
        },
    });
};

export const deleteReplyReviewById = ({ id, replyId, userId }: DeleteReplyReview) => {
    return prisma.review.update({
        where: {
            id,
        },
        data: {
            children: {
                deleteMany: {
                    where: {
                        id: replyId,
                        userId,
                    },
                },
            },
        },
    });
};
