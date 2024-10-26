import { Review, UserBaseEmbed } from '@prisma/client';
import { CreateReviewRequest, UpdateReviewRequest } from '../schemas/review.schema';
import { IUserId } from './user';

export type ReviewId = Review['id'];

export type CreateReviewInput = CreateReviewRequest & {
    renter: UserBaseEmbed;
    owner: UserBaseEmbed;
    slug: string;
};

export type ReplyReview = {
    userId: string;
    id: string;
} & Pick<CreateReviewInput, 'content' | 'medias' | 'rating'>;

export type UpdateReview = {
    userId: IUserId;
    id: ReviewId;
    replyId?: string;
    data: UpdateReviewRequest;
};

export type UpdateReviewById = {
    id: ReviewId;
    userId: IUserId;
    data: UpdateReviewRequest;
};

export type UpdateReplyReview = {
    userId: IUserId;
    id: ReviewId;
    replyId: string;
    data: UpdateReviewRequest;
};

export type DeleteReviewService = {
    userId: IUserId;
    id: ReviewId;
    replyId?: string;
};

// mark all to require
export type DeleteReplyReview = Required<DeleteReviewService>;

// get all require properties
export type DeleteReview = Omit<DeleteReviewService, 'replyId'>;
