import { Conversation } from '@prisma/client';
import { IBlockUser, ICreateChatReq, IReadConversation } from '../interface/chat';
import { IPagination, IPaginationResponse } from '../interface/pagination';
import {
    blockUser,
    countConversationsByUserId,
    createConversation,
    getConversationsByUserId,
    readChat,
} from '../repositories/conversation.repository';
import getPageInfo from '../utils/getPageInfo';

export const addChatService = async (data: ICreateChatReq) => {
    return createConversation(data);
};

export const getConversationsByUserIdService = async (userId: string, pagination: IPagination) => {
    const [conversations, count] = await Promise.all([
        getConversationsByUserId(userId, pagination),
        countConversationsByUserId(userId),
    ]);

    const response: IPaginationResponse<Conversation> = {
        data: conversations,
        pageInfo: getPageInfo({
            count,
            ...pagination,
        }),
    };

    return response;
};

export const readChatService = (data: IReadConversation) => {
    return readChat(data);
};

export const blockUserService = (data: IBlockUser) => {
    return blockUser(data);
};
