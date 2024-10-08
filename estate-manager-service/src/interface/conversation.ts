import { ICreateChatReq } from './chat';

export interface ICreateConversation extends ICreateChatReq {
    conversationId: string;
}
