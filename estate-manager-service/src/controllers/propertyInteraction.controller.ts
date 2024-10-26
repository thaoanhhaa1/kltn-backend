import { NextFunction, Request, Response } from 'express';
import Redis from '../configs/redis.config';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
    createPropertyInteractionService,
    getAllPropertyInteractionService,
    getPropertyInteractionByIdService,
    softDeletePropertyInteractionService,
    updatePropertyInteractionService,
} from '../services/propertyInteraction.service';
import { ResponseType } from '../types/response.type';
import CustomError from '../utils/error.util';
import {
    countFavoritePropertyInteractionsService,
    getFavoritePropertyInteractionBySlugService,
    getFavoritePropertyInteractionsService,
} from './../services/propertyInteraction.service';

const REDIS_KEY = {
    PROPERTY: 'propertyInteractions:',
};

export const createPropertyInteraction = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const interaction = req.body;
        const newInteraction = await createPropertyInteractionService({
            ...interaction,
            userId: req.user!.id,
        });

        Redis.getInstance()
            .getClient()
            .del(REDIS_KEY.PROPERTY + req.user!.id)
            .then();
        res.status(201).json(newInteraction);
    } catch (error) {
        next(error);
    }
};

export const getAllPropertyInteraction = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const KEY = REDIS_KEY.PROPERTY + userId;
        const interactionsRedis = await Redis.getInstance().getClient().get(KEY);

        if (interactionsRedis) return res.status(200).json(interactionsRedis);

        const interactions = await getAllPropertyInteractionService(userId);
        Redis.getInstance()
            .getClient()
            .set(KEY, interactions, {
                ex: 60 * 60,
            })
            .then();

        res.status(200).json(interactions);
    } catch (error) {
        next(error);
    }
};

export const getPropertyInteractionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { interaction_id } = req.params;

        const KEY = REDIS_KEY.PROPERTY + interaction_id;

        const interactionRedis = await Redis.getInstance().getClient().get(KEY);

        if (interactionRedis) return res.status(200).json(interactionRedis);

        const interaction = await getPropertyInteractionByIdService(interaction_id);

        if (!interaction) throw new CustomError(404, 'Interaction not found');

        Redis.getInstance()
            .getClient()
            .set(KEY, interaction, {
                ex: 60 * 60,
            })
            .then();

        res.status(200).json(interaction);
    } catch (error) {
        next(error);
    }
};

export const updatePropertyInteraction = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { interactionType } = req.body;
        const { interactionId } = req.params;
        const userId = req.user!.id;

        Redis.getInstance()
            .getClient()
            .del(REDIS_KEY.PROPERTY + interactionId)
            .then();
        Redis.getInstance()
            .getClient()
            .del(REDIS_KEY.PROPERTY + userId)
            .then();

        res.status(200).json(await updatePropertyInteractionService({ interactionType, interactionId, userId }));
    } catch (error) {
        next(error);
    }
};

export const deletePropertyInteraction = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { interactionId } = req.params;
        const userId = req.user!.id;

        Redis.getInstance()
            .getClient()
            .del(REDIS_KEY.PROPERTY + interactionId)
            .then();
        Redis.getInstance()
            .getClient()
            .del(REDIS_KEY.PROPERTY + userId)
            .then();
        res.status(200).json(
            await softDeletePropertyInteractionService({
                interactionId,
                userId,
            }),
        );
    } catch (error) {
        next(error);
    }
};

export const getFavoritePropertyInteractions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const interactions = await getFavoritePropertyInteractionsService(userId);

        res.status(200).json(interactions);
    } catch (error) {
        next(error);
    }
};

export const countFavoritePropertyInteractions = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user!.id;

        if (!req.user?.userTypes.includes('renter'))
            return {
                message: 'Số lượng bất động sản yêu thích',
                statusCode: 200,
                success: true,
                data: 0,
            };

        const count = await countFavoritePropertyInteractionsService(userId);

        const result: ResponseType = {
            message: 'Số lượng bất động sản yêu thích',
            statusCode: 200,
            success: true,
            data: count,
        };

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const getFavoritePropertyInteractionBySlug = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user!.id;
        const { slug } = req.params;

        const interaction = await getFavoritePropertyInteractionBySlugService(userId, slug);

        if (!interaction) throw new CustomError(404, 'Không tìm thấy bất động sản');

        res.status(200).json(interaction);
    } catch (error) {
        next(error);
    }
};
