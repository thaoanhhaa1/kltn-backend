import { Chat, Conversation, UserBaseEmbed } from '@prisma/client';
import { IUserId } from './user';

export type IChatId = Chat['chatId'];

export interface ICreateChatReq {
    chatId: Chat['chatId'];
    receiver: UserBaseEmbed;
    sender: UserBaseEmbed;
    message: Chat['message'];
    medias: Chat['medias'];
    createdAt: Date;
    conversationId: Conversation['conversationId'];
}

export type IReceiveChatSocket = Omit<ICreateChatReq, 'createdAt'> & {
    createdAt: string;
};

export type ICreateChat = Omit<Chat, 'savedBy' | 'deletedBy' | 'status' | 'updatedAt'>;

export interface IGetChatsByUserId {
    senderId: Chat['senderId'];
    nextChat?: string;
}

export interface IReadConversation {
    conversationId: Conversation['conversationId'];
    time: string;
    chatId: Chat['chatId'];
    userId: IUserId;
}

export interface IBlockUser {
    conversationId: Conversation['conversationId'];
    blocker: IUserId;
}
