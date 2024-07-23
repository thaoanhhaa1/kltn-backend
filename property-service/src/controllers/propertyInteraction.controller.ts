import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
    createPropertyInteractionService,
    getAllPropertyInteractionService,
    getPropertyInteractionByIdService,
    softDeletePropertyInteractionService,
    updatePropertyInteractionService,
} from '../services/propertyInteraction.service';
import CustomError from '../utils/error.util';
import Redis from '../configs/redis.config';

const REDIS_KEY = {
    PROPERTY: 'propertyInteractions:',
};

export const createPropertyInteraction = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const interaction = req.body;
        const newInteraction = await createPropertyInteractionService({
            ...interaction,
            user_id: req.user!.id,
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
        const { interaction_type } = req.body;
        const { interaction_id } = req.params;
        const user_id = req.user!.id;

        Redis.getInstance()
            .getClient()
            .del(REDIS_KEY.PROPERTY + interaction_id)
            .then();
        Redis.getInstance()
            .getClient()
            .del(REDIS_KEY.PROPERTY + user_id)
            .then();

        res.status(200).json(await updatePropertyInteractionService({ interaction_type, interaction_id, user_id }));
    } catch (error) {
        next(error);
    }
};

export const deletePropertyInteraction = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { interaction_id } = req.params;
        const user_id = req.user!.id;

        Redis.getInstance()
            .getClient()
            .del(REDIS_KEY.PROPERTY + interaction_id)
            .then();
        Redis.getInstance()
            .getClient()
            .del(REDIS_KEY.PROPERTY + user_id)
            .then();
        res.status(200).json(
            await softDeletePropertyInteractionService({
                interaction_id: interaction_id,
                user_id,
            }),
        );
    } catch (error) {
        next(error);
    }
};
