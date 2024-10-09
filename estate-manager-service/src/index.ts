import express from 'express';
import { Server } from 'socket.io';
import elasticClient from './configs/elastic.config';
import envConfig from './configs/env.config';
import RabbitMQ from './configs/rabbitmq.config';
import { CONTRACT_QUEUE, CREATE_CHAT_QUEUE, PROPERTY_QUEUE, SYNC_MESSAGE_QUEUE_CONTRACT } from './constants/rabbitmq';
import { IReadConversation } from './interface/chat';
import errorHandler from './middlewares/error.middleware';
import { findChatById } from './repositories/conversation.repository';
import { updateStatus } from './repositories/property.repository';
import router from './routes';
import { addChatService, readChatService } from './services/conversation.service';
import { getNotPendingPropertiesService } from './services/property.service';
import socketService from './services/socket.io.service';

const app = express();

const rabbitMQ = RabbitMQ.getInstance();

rabbitMQ.connect();

app.use(express.json());

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
            case SYNC_MESSAGE_QUEUE_CONTRACT.type.GET_PROPERTY_DETAIL:
                const property = await elasticClient.get({
                    index: 'properties',
                    id: data,
                });

                return property._source;
            default:
                throw new Error(`Queue ${SYNC_MESSAGE_QUEUE_CONTRACT.name} has no type ${type}`);
        }
    },
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
