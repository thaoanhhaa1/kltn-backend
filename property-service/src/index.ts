import express from 'express';
import envConfig from './configs/env.config';
import RabbitMQ from './configs/rabbitmq.config';
import { USER_QUEUE } from './constants/rabbitmq';
import { ICreateUserReq } from './interfaces/user';
import errorHandler from './middlewares/error.middleware';
import router from './routes';
import { createUser } from './services/user.service';
import elasticClient from './configs/elastic.config';
import { getAllPropertiesService } from './services/property.service';

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
    res.send('Hello World!');
});

app.use(envConfig.PREFIX, router);

app.use(errorHandler);

RabbitMQ.getInstance().consumeQueue(USER_QUEUE.name, async (message) => {
    if (message) {
        const { type, data } = JSON.parse(message.content.toString());
        const user: ICreateUserReq = data;

        switch (type) {
            case USER_QUEUE.type.CREATED:
                await createUser(user);
                break;
        }
    }
});

elasticClient
    .info()
    .then(async () => {
        console.log('Elasticsearch is connected');

        try {
            await elasticClient.delete({
                index: 'properties',
                id: '1',
            });
        } catch (error) {
        } finally {
            const properties = await getAllPropertiesService();

            await elasticClient.bulk({
                index: 'properties',
                body: properties.flatMap((property) => [{ index: { _id: property.property_id } }, property]),
            });

            console.log('Properties added to ElasticSearch');
        }
    })
    .catch((err) => {
        console.error('Elasticsearch connection error:', err);
    });

const PORT = envConfig.PORT || 4003;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;
