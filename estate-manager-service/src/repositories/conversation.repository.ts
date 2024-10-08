import { UserBaseEmbed } from '@prisma/client';
import { IReadConversation } from '../interface/chat';
import { ICreateConversation } from '../interface/conversation';
import { IPagination } from '../interface/pagination';
import { IUserId } from '../interface/user';
import prisma from '../prisma/prismaClient';

export const createConversation = ({
    conversationId,
    chatId,
    createdAt,
    medias,
    message,
    receiver,
    sender,
}: ICreateConversation) => {
    return prisma.conversation.upsert({
        where: {
            conversationId,
        },
        update: {
            chats: {
                push: {
                    chatId,
                    medias,
                    message,
                    createdAt,
                    senderId: sender.userId,
                    savedBy: [],
                    deletedBy: [],
                    status: 'RECEIVED',
                    updatedAt: createdAt,
                },
            },
            updatedAt: createdAt,
        },
        create: {
            conversationId,
            participants: [sender, receiver],
            delete: [],
            chats: {
                chatId,
                medias,
                message,
                createdAt,
                senderId: sender.userId,
                savedBy: [],
                deletedBy: [],
                status: 'RECEIVED',
                updatedAt: createdAt,
            },
            createdAt,
            updatedAt: createdAt,
        },
    });
};

export const getConversationsByUserId = (userId: IUserId, { skip, take }: IPagination) => {
    return prisma.conversation.findMany({
        where: {
            participants: {
                some: {
                    userId,
                },
            },
        },
        orderBy: {
            updatedAt: 'desc',
        },
        // skip,
        // take,
    });
};

export const countConversationsByUserId = (userId: IUserId) => {
    return prisma.conversation.count({
        where: {
            participants: {
                some: {
                    userId,
                },
            },
        },
    });
};

export const readChat = ({ conversationId, time }: IReadConversation) => {
    return prisma.conversation.update({
        where: {
            conversationId,
        },
        data: {
            chats: {
                updateMany: {
                    where: {
                        createdAt: {
                            lte: new Date(time),
                        },
                    },
                    data: {
                        status: 'READ',
                    },
                },
            },
        },
    });
};

export const updateUserInfoInConversation = ({ userId, ...rest }: UserBaseEmbed) => {
    return prisma.conversation.updateMany({
        data: {
            participants: {
                updateMany: {
                    where: {
                        userId,
                    },
                    data: {
                        ...rest,
                    },
                },
            },
        },
    });
};
