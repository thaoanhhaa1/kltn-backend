import { Chat, Conversation, UserBaseEmbed } from '@prisma/client';

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

export type IReceiveChatSocket = Omit<ICreateChatReq, 'createdAt' | 'chatId'>;

export type ICreateChat = Omit<Chat, 'savedBy' | 'deletedBy' | 'status' | 'updatedAt'>;

export interface IGetChatsByUserId {
    senderId: Chat['senderId'];
    nextChat?: string;
}

export interface IReadConversation {
    conversationId: Conversation['conversationId'];
    time: string;
}
