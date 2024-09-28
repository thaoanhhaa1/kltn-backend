import { ChatEmbed, UserBaseEmbed } from '@prisma/client';

export interface ICreateConversation {
    conversationId: string;
    participants: UserBaseEmbed[];
    lastChat: ChatEmbed;
}
