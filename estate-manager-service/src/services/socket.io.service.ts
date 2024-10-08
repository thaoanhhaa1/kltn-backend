import { UserBaseEmbed } from '@prisma/client';
import { DefaultEventsMap, ExtendedError, Server, Socket } from 'socket.io';
import { v4 } from 'uuid';
import RabbitMQ from '../configs/rabbitmq.config';
import { CREATE_CHAT_QUEUE } from '../constants/rabbitmq';
import { ICreateChatReq, IReadConversation, IReceiveChatSocket } from '../interface/chat';
import { IUserId } from '../interface/user';
import { getUserBaseEmbedById } from '../repositories/user.repository';
import createChatConversation from '../utils/createChatConversation.util';
import { verifyToken } from '../utils/jwt.util';

export const authenticateSocket = (socket: Socket, next: (err?: ExtendedError | undefined) => void) => {
    const token = socket.handshake.auth.token;

    if (!token) return next(new Error('Authentication error'));

    const decode = verifyToken(token);

    if (typeof decode === 'string') return next(new Error(decode));

    socket.data.user = decode;
    next();
};

const socketIds: {
    [key: string]: string;
} = {};

const users: {
    [key: string]: UserBaseEmbed;
} = {};

const socketService = (socketId: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {
    socketId.on('connection', (socket: Socket) => {
        socket.on('online', (userId: IUserId) => {
            console.log('🚀 ~ socket::online ~ userId:', userId);

            socketIds[socket.id] = userId;
            getUserBaseEmbedById(userId).then((user) => {
                if (!user) return;
                users[socket.id] = user;

                console.log('🚀 ~ socket::online ~ users:', users);
            });
        });

        socket.on('receive-message', (data: IReceiveChatSocket) => {
            const receiverSocketId = Object.keys(socketIds).find((key) => socketIds[key] === data.receiver.userId);

            const createdAt = new Date();

            const dataQueue: ICreateChatReq = {
                ...data,
                createdAt,
                chatId: `${createdAt.getTime()}-${v4()}`,
                conversationId: createChatConversation(data.sender.userId, data.receiver.userId),
            };

            if (receiverSocketId) socketId.to(receiverSocketId).emit('send-message', dataQueue);
            socketId.to(socket.id).emit('send-message', dataQueue);

            RabbitMQ.getInstance().sendToQueue(CREATE_CHAT_QUEUE.name, {
                type: CREATE_CHAT_QUEUE.type.CREATE_CHAT,
                data: dataQueue,
            });
        });

        socket.on('readConversation', (data: IReadConversation) => {
            RabbitMQ.getInstance().sendToQueue(CREATE_CHAT_QUEUE.name, {
                type: CREATE_CHAT_QUEUE.type.READ_CHAT,
                data,
            });
            console.log('🚀 ~ socket::readConversation ~ data:', data);
        });

        socket.on('disconnect', () => {
            console.log('🚀 ~ socket::disconnect ~ socket.id:', socket.id);
            delete socketIds[socket.id];
            delete users[socket.id];
        });
    });
};

export default socketService;
