import { ICreateChat, IGetChatsByUserId } from '../interface/chat';
import { IUserId } from '../interface/user';
import prisma from '../prisma/prismaClient';

const getWhereUserById = (userId: IUserId, isSender: boolean) => {
    return {
        [isSender ? 'sender' : 'receiver']: {
            is: {
                userId,
            },
        },
    };
};

export const create = (chat: ICreateChat) => {
    return prisma.chat.create({
        data: chat,
    });
};

export const getChatsByUserId = ({ receiverId, senderId, nextChat }: IGetChatsByUserId) => {
    return prisma.chat.findMany({
        where: {
            OR: [
                {
                    AND: [getWhereUserById(senderId, true), getWhereUserById(receiverId, false)],
                },
                {
                    AND: [getWhereUserById(receiverId, true), getWhereUserById(senderId, false)],
                },
            ],
            status: {
                notIn: ['RECALL', 'DELETED'],
            },
            ...(nextChat && {
                chatId: {
                    lt: nextChat,
                },
            }),
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 10,
    });
};
