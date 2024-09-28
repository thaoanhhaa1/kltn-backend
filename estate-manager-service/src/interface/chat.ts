import { Chat } from '@prisma/client';

export type IChatId = Chat['chatId'];

export interface ICreateChatReq {
    chatId: Chat['chatId'];
    sender: Chat['sender'];
    receiver: Chat['receiver'];
    message: Chat['message'];
    medias: Chat['medias'];
    createdAt: Chat['createdAt'];
    conversation: Chat['conversation'];
}

export type IReceiveChatSocket = Omit<ICreateChatReq, 'createdAt' | 'chatId'>;

export type ICreateChat = Omit<Chat, 'savedBy' | 'deletedBy' | 'status' | 'updatedAt'>;

export interface IGetChatsByUserId {
    senderId: Chat['sender']['userId'];
    receiverId: Chat['receiver']['userId'];
    nextChat?: string;
}
