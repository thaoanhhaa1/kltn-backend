import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { createReviewSchema, updateReviewSchema } from '../schemas/review.schema';
import {
    createReviewService,
    deleteReviewByIdService,
    getReviewsByContractIdService,
    getReviewsBySlugService,
    updateReviewByIdService,
} from '../services/review.service';
import { ResponseType } from '../types/response.type';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';
import { uploadFiles } from '../utils/uploadToFirebase.util';

export const createReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const files = req.files as Express.Multer.File[] | undefined;
        const imageUrls: Array<string> = req.body.imageUrls || [];

        if (files) imageUrls.push(...files.map((file) => file.originalname));

        const safeParse = createReviewSchema.safeParse({
            ...req.body,
            medias: imageUrls,
        });

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
                message: 'Dữ liệu không hợp lệ',
                status: 400,
            });

        if (files) {
            const images = await uploadFiles({ files, folder: 'review-service' });

            imageUrls.length = 0;

            imageUrls.push(...images);
        }

        const review = await createReviewService(userId, {
            ...safeParse.data,
            medias: imageUrls,
        });

        res.status(201).json(review);
    } catch (error) {
        console.log(error);

        next(error);
    }
};

export const getReviewsByContractId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const contractId = req.params.contractId;

        const reviews = await getReviewsByContractIdService(contractId, userId);

        res.status(200).json(reviews);
    } catch (error) {
        next(error);
    }
};

export const getReviewsBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const propertyId = req.params.propertyId;

        const reviews = await getReviewsBySlugService(propertyId);

        res.status(200).json(reviews);
    } catch (error) {
        next(error);
    }
};

export const updateReviewById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const reviewId = req.params.reviewId;
        const files = req.files as Express.Multer.File[] | undefined;

        console.log(req.body);
        const oldUrls =
            (Array.isArray(req.body.medias) && req.body.medias) || (req.body.medias && [req.body.medias]) || [];
        const imageUrls: Array<string> = [...oldUrls];

        if (files) imageUrls.push(...files.map((file) => file.originalname));

        const safeParse = updateReviewSchema.safeParse({
            ...req.body,
            medias: imageUrls,
        });

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
                message: 'Dữ liệu không hợp lệ',
                status: 400,
            });

        if (files) {
            const images = await uploadFiles({ files, folder: 'review-service' });

            imageUrls.length = 0;

            imageUrls.push(...oldUrls, ...images);
        }

        const review = await updateReviewByIdService({
            data: {
                ...safeParse.data,
                medias: imageUrls,
            },
            id: reviewId,
            userId,
            replyId: req.body.replyId,
        });

        res.status(200).json(review);
    } catch (error) {
        next(error);
    }
};

export const deleteReviewById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const reviewId = req.params.reviewId;
        const replyId = req.query.replyId as string | undefined;

        const review = await deleteReviewByIdService({ id: reviewId, userId, replyId });

        const result: ResponseType = {
            message: 'Xóa đánh giá thành công',
            statusCode: 204,
            success: true,
            data: review,
        };

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
