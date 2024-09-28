import { ICreateConversation } from '../interface/conversation';
import { IPagination } from '../interface/pagination';
import { IUserId } from '../interface/user';
import prisma from '../prisma/prismaClient';

export const createConversation = ({ conversationId, ...rest }: ICreateConversation) => {
    return prisma.conversation.upsert({
        where: {
            conversationId,
        },
        update: rest,
        create: {
            conversationId,
            ...rest,
        },
    });
};

export const getConversationsByUserId = (userId: IUserId, pagination: IPagination) => {
    console.log('🚀 ~ getConversationsByUserId ~ pagination:', pagination);

    return prisma.conversation.findMany({
        where: {
            participants: {
                some: {
                    userId,
                },
            },
            NOT: {
                deletedBy: {
                    hasSome: [userId],
                },
            },
        },
        orderBy: {
            updatedAt: 'desc',
        },
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
            NOT: {
                deletedBy: {
                    hasSome: [userId],
                },
            },
        },
    });
};
