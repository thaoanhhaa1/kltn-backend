import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { createChatService, getChatsByUserIdService, getConversationsByUserIdService } from '../services/chat.service';
import CustomError from '../utils/error.util';

export const createChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const chat = await createChatService({
            ...req.body,
            sender: userId,
            createdAt: new Date(),
        });

        res.status(201).json(chat);
    } catch (error) {
        next(error);
    }
};

export const getConversationsByUserId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const take = Number(req.query.take) || 10;
        const skip = Number(req.query.skip) || 0;

        const conversations = await getConversationsByUserIdService(userId, {
            skip,
            take,
        });

        res.status(200).json(conversations);
    } catch (error) {
        next(error);
    }
};

export const getChatsByUserId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { nextChat, receiver } = req.query;

        if (!receiver) throw new CustomError(400, 'Người nhận không được để trống');

        const chats = await getChatsByUserIdService({
            receiverId: receiver as string,
            senderId: userId,
            nextChat: nextChat as string | undefined,
        });

        console.log('chats', chats);

        res.status(200).json(chats);
    } catch (error) {
        next(error);
    }
};
