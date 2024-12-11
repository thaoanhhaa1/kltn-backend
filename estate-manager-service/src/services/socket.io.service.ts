import { UserBaseEmbed } from '@prisma/client';
import { DefaultEventsMap, ExtendedError, Server, Socket } from 'socket.io';
import RabbitMQ from '../configs/rabbitmq.config';
import { CREATE_CHAT_QUEUE, INTERNAL_ESTATE_MANAGER_QUEUE } from '../constants/rabbitmq';
import { IBlockUser, ICreateChatReq, IReadConversation, IReceiveChatSocket } from '../interface/chat';
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
    const emitToUser = (userId: string, event: string, data: any) => {
        Object.keys(socketIds).forEach((key) => {
            if (socketIds[key] === userId) socketId.to(key).emit(event, data);
        });

        if (data.toRole === 'admin') {
            Object.keys(socketIds).forEach((key) => {
                if (socketIds[key] === '66debd900e6c4120522fb548') socketId.to(key).emit(event, data);
            });
        }
    };

    RabbitMQ.getInstance().consumeQueue(INTERNAL_ESTATE_MANAGER_QUEUE.name, (msg) => {
        if (!msg) return;

        const { data, type } = JSON.parse(msg.content.toString());

        switch (type) {
            case INTERNAL_ESTATE_MANAGER_QUEUE.type.CREATE_NOTIFICATION:
                const userId = data.to;

                userId && emitToUser(userId, 'create-notification', data);

                break;
            default:
                break;
        }
    });

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
            const dataQueue: ICreateChatReq = {
                ...data,
                createdAt: new Date(data.createdAt),
                conversationId: createChatConversation(data.sender.userId, data.receiver.userId),
            };

            if (data.receiver.userId) emitToUser(data.receiver.userId, 'send-message', dataQueue);
            socketId.to(socket.id).emit('send-message', dataQueue);

            RabbitMQ.getInstance().sendToQueue(CREATE_CHAT_QUEUE.name, {
                type: CREATE_CHAT_QUEUE.type.CREATE_CHAT,
                data: dataQueue,
            });
        });

        socket.on('read-conversation', (data: IReadConversation) => {
            RabbitMQ.getInstance().sendToQueue(CREATE_CHAT_QUEUE.name, {
                type: CREATE_CHAT_QUEUE.type.READ_CHAT,
                data,
            });

            emitToUser(data.userId, 'read-conversation', data);
        });

        socket.on('blocked', ({ conversationId, blocker }: IBlockUser) => {
            const blockerSocketId = Object.keys(socketIds).find((key) => socketIds[key] === blocker);

            if (blockerSocketId) {
            }

            RabbitMQ.getInstance().sendToQueue(CREATE_CHAT_QUEUE.name, {
                type: CREATE_CHAT_QUEUE.type.BLOCK_USER,
                data: {
                    conversationId,
                    blocker,
                },
            });

            console.log('🚀 ~ socket::blocked ~ conversationId:', conversationId);
        });

        socket.on('disconnect', () => {
            console.log('🚀 ~ socket::disconnect ~ socket.id:', socket.id);
            delete socketIds[socket.id];
            delete users[socket.id];
        });
    });
};

export default socketService;
