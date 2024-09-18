import express from 'express';
import elasticClient from './configs/elastic.config';
import envConfig from './configs/env.config';
import RabbitMQ from './configs/rabbitmq.config';
import { CONTRACT_QUEUE, PROPERTY_QUEUE } from './constants/rabbitmq';
import errorHandler from './middlewares/error.middleware';
import { updateStatus } from './repositories/property.repository';
import router from './routes';
import { getNotPendingPropertiesService } from './services/property.service';

const app = express();

RabbitMQ.getInstance().connect();

app.use(express.json());

app.get('/health', (_req, res) => {
    res.send('OK');
});

app.use(envConfig.PREFIX, router);

app.use(errorHandler);

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

RabbitMQ.getInstance().consumeQueue(CONTRACT_QUEUE.name, async (message) => {
    if (!message) return;

    const { type, data } = JSON.parse(message.content.toString());

    if (type === CONTRACT_QUEUE.type.UPDATE_STATUS) {
        const { propertyId, status } = data;

        const property = await updateStatus(propertyId, status);

        RabbitMQ.getInstance().publishInQueue({
            exchange: PROPERTY_QUEUE.exchange,
            message: {
                type: PROPERTY_QUEUE.type.UPDATED,
                data: property,
            },
            name: PROPERTY_QUEUE.name,
        });
    }
});

const PORT = envConfig.PORT || 4001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;
