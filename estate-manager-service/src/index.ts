import express from 'express';
import { Server } from 'socket.io';
import elasticClient from './configs/elastic.config';
import envConfig from './configs/env.config';
import RabbitMQ from './configs/rabbitmq.config';
import { CONTRACT_QUEUE, CREATE_CHAT_QUEUE, PROPERTY_QUEUE, SYNC_MESSAGE_QUEUE_CONTRACT } from './constants/rabbitmq';
import { IReadConversation } from './interface/chat';
import errorHandler from './middlewares/error.middleware';
import { findChatById } from './repositories/conversation.repository';
import { getPropertyById, updateStatus } from './repositories/property.repository';
import { findUserDetailByUserId } from './repositories/userDetail.repository';
import router from './routes';
import { addChatService, readChatService } from './services/conversation.service';
import { createNotificationService } from './services/notification.service';
import { getNotPendingPropertiesService, getPropertyBySlugService } from './services/property.service';
import socketService from './services/socket.io.service';

const app = express();

const rabbitMQ = RabbitMQ.getInstance();

rabbitMQ.connect().then(() => {
    rabbitMQ.consumeQueue(CONTRACT_QUEUE.name, async (message) => {
        if (!message) return;

        const { type, data } = JSON.parse(message.content.toString());

        if (type === CONTRACT_QUEUE.type.UPDATE_STATUS) {
            const { propertyId, status } = data;

            const property = await updateStatus(propertyId, status);

            rabbitMQ.publishInQueue({
                exchange: PROPERTY_QUEUE.exchange,
                message: {
                    type: PROPERTY_QUEUE.type.UPDATED,
                    data: property,
                },
                name: PROPERTY_QUEUE.name,
            });
        } else if (type === CONTRACT_QUEUE.type.NOTIFICATION_CREATED) {
            console.log('Notification created', data);

            createNotificationService(data)
                .then((notification) => console.log('Notification created', notification))
                .catch((error) => console.error('Error creating notification', error));
        }
    });

    rabbitMQ.consumeQueueWithAck(CREATE_CHAT_QUEUE.name, async (message) => {
        console.log(`Consume message ${message?.content} on queue ${CREATE_CHAT_QUEUE.name}`);
        if (!message) return;

        const { type, data } = JSON.parse(message.content.toString());

        switch (type) {
            case CREATE_CHAT_QUEUE.type.CREATE_CHAT:
                console.log('Create chat', Date.now());
                await addChatService({
                    ...data,
                    createdAt: new Date(data.createdAt),
                    sender: {
                        avatar: data.sender.avatar,
                        userId: data.sender.userId,
                        name: data.sender.name,
                    },
                    receiver: {
                        avatar: data.receiver.avatar,
                        userId: data.receiver.userId,
                        name: data.receiver.name,
                    },
                });
                console.log('Chat added', data);

                break;
            case CREATE_CHAT_QUEUE.type.READ_CHAT:
                const readChat = data as IReadConversation;

                const conversation = await findChatById(readChat.conversationId, readChat.chatId);

                if (!conversation) throw new Error('Conversation not found');

                console.log('Read chat', Date.now());
                await readChatService(readChat);
                console.log('Chat read', readChat);

                break;
            case CREATE_CHAT_QUEUE.type.BLOCK_USER:
                break;
            default:
                throw new Error(`Queue ${CREATE_CHAT_QUEUE.name} has no type ${type}`);
        }
    });

    rabbitMQ.receiveSyncMessage({
        queue: SYNC_MESSAGE_QUEUE_CONTRACT.name,
        callback: async (message) => {
            if (!message) return;

            const { data, type } = JSON.parse(message);

            switch (type) {
                case SYNC_MESSAGE_QUEUE_CONTRACT.type.GET_PROPERTY_DETAIL: {
                    const property = await elasticClient.get({
                        index: 'properties',
                        id: data,
                    });

                    return property._source;
                }
                case SYNC_MESSAGE_QUEUE_CONTRACT.type.GET_USER_DETAIL: {
                    const user = await findUserDetailByUserId(data);

                    return user;
                }
                case SYNC_MESSAGE_QUEUE_CONTRACT.type.GET_PROPERTY_BY_SLUG: {
                    try {
                        console.log('SYNC_MESSAGE_QUEUE_CONTRACT.type.GET_PROPERTY_BY_SLUG', data);
                        const property = await getPropertyBySlugService(data);

                        return property;
                    } catch (error) {
                        return null;
                    }
                }
                case SYNC_MESSAGE_QUEUE_CONTRACT.type.GET_PROPERTY_BY_ID: {
                    const property = await getPropertyById(data);

                    return property;
                }
                default:
                    throw new Error(`Queue ${SYNC_MESSAGE_QUEUE_CONTRACT.name} has no type ${type}`);
            }
        },
    });

    // getAllService().then((properties) => {
    //     console.log('🚀 ~ getAllService ~ properties:', properties);
    //     properties.forEach((property) => {
    //         RabbitMQ.getInstance().publishInQueue({
    //             exchange: PROPERTY_QUEUE.exchange,
    //             name: PROPERTY_QUEUE.name,
    //             message: {
    //                 type: PROPERTY_QUEUE.type.UPDATED,
    //                 data: property,
    //             },
    //         });
    //     });
    // });
});

app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
    res.send('OK');
});

app.use(envConfig.PREFIX, router);

elasticClient
    .info()
    .then(async () => {
        console.log('Elasticsearch is connected');

        try {
            await elasticClient.deleteByQuery({
                index: 'properties',
                body: {
                    query: {
                        match_all: {},
                    },
                },
            });
        } catch (error) {
            console.log('Error deleting document:', error);
        } finally {
            const properties = await getNotPendingPropertiesService();

            if (properties.length === 0) {
                console.log('No properties to add to ElasticSearch');
                return;
            }
            await elasticClient.bulk({
                index: 'properties',
                body: properties.flatMap((property) => [{ index: { _id: property.propertyId } }, property]),
            });
            console.log('Properties added to ElasticSearch');
        }
    })
    .catch((err) => {
        console.error('Elasticsearch connection error:', err);
    });

const PORT = envConfig.PORT || 4001;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const io = new Server(server, {
    pingTimeout: 60000,
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
    },
});

socketService(io);

app.use(errorHandler);

export default app;
