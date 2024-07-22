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

export const createPropertyInteraction = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const interaction = req.body;
        const newInteraction = await createPropertyInteractionService({
            ...interaction,
            user_id: req.user!.id,
        });

        res.status(201).json(newInteraction);
    } catch (error) {
        next(error);
    }
};

export const getAllPropertyInteraction = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        res.status(200).json(await getAllPropertyInteractionService(userId));
    } catch (error) {
        next(error);
    }
};

export const getPropertyInteractionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { interaction_id } = req.params;

        const interaction = await getPropertyInteractionByIdService(interaction_id);

        if (!interaction) throw new CustomError(404, 'Interaction not found');

        res.status(200).json(await getPropertyInteractionByIdService(interaction_id));
    } catch (error) {
        next(error);
    }
};

export const updatePropertyInteraction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { interaction_type } = req.body;
        const { interaction_id } = req.params;

        res.status(200).json(await updatePropertyInteractionService({ interaction_type, interaction_id }));
    } catch (error) {
        next(error);
    }
};

export const deletePropertyInteraction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { interaction_id } = req.params;

        res.status(200).json(await softDeletePropertyInteractionService(interaction_id));
    } catch (error) {
        next(error);
    }
};
