import { Conversation } from '@prisma/client';
import { ICreateChatReq, IGetChatsByUserId } from '../interface/chat';
import { IPagination, IPaginationResponse } from '../interface/pagination';
import prisma from '../prisma/prismaClient';
import { create, getChatsByUserId } from '../repositories/chat.repository';
import {
    countConversationsByUserId,
    createConversation,
    getConversationsByUserId,
} from '../repositories/conversation.repository';
import createChatConversation from '../utils/createChatConversation.util';
import CustomError from '../utils/error.util';
import { getOtherUser } from '../utils/getOtherUser.util';
import getPageInfo from '../utils/getPageInfo';

export const createChatService = async (chat: ICreateChatReq) => {
    const { receiver, sender } = chat;

    if (!sender || !receiver) throw new CustomError(404, 'Không tìm thấy người dùng');

    const conversation = createChatConversation(sender.userId, receiver.userId);

    const [chatResult] = await prisma.$transaction([
        create({
            ...chat,
            conversation,
            receiver,
            sender,
        }),
        createConversation({
            conversationId: conversation,
            participants: [sender, receiver],
            lastChat: {
                medias: chat.medias,
                message: chat.message,
                status: 'RECEIVED',
                sender,
            },
        }),
    ]);

    return chatResult;
};

export const getConversationsByUserIdService = async (userId: string, pagination: IPagination) => {
    const [conversation, count] = await Promise.all([
        getConversationsByUserId(userId, pagination),
        countConversationsByUserId(userId),
    ]);

    const res: IPaginationResponse<Conversation> = {
        data: conversation.map((item) => ({
            ...item,
            receiver: getOtherUser(item.participants, userId),
        })),
        pageInfo: getPageInfo({
            count,
            ...pagination,
        }),
    };

    return res;
};

export const getChatsByUserIdService = (params: IGetChatsByUserId) => {
    return getChatsByUserId(params);
};
