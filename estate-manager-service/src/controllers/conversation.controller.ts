import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { getConversationsByUserIdService } from '../services/conversation.service';

export const getConversationsByUserId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const take = Number(req.query.take) || 10;
        const skip = Number(req.query.skip) || 0;

        const result = await getConversationsByUserIdService(userId, { take, skip });

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
