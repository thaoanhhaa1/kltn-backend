import express from 'express';
import elasticClient from './configs/elastic.config';
import envConfig from './configs/env.config';
import RabbitMQ from './configs/rabbitmq.config';
import { USER_QUEUE } from './constants/rabbitmq';
import { ICreateUserReq } from './interfaces/user';
import errorHandler from './middlewares/error.middleware';
import router from './routes';
import { getNotPendingPropertiesService } from './services/property.service';
import { createUser, updateUserService } from './services/user.service';

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
    res.send('Hello World!');
});

app.use(envConfig.PREFIX, router);

app.use(errorHandler);

RabbitMQ.getInstance().subscribeToQueue({
    exchange: USER_QUEUE.exchange,
    name: USER_QUEUE.name,
    callback: async (message) => {
        if (message) {
            const { type, data } = JSON.parse(message.content.toString());

            const user: ICreateUserReq = data;

            switch (type) {
                case USER_QUEUE.type.CREATED:
                    await createUser({
                        avatar: user.avatar,
                        email: user.email,
                        name: user.name,
                        phone_number: user.phone_number,
                        user_types: user.user_types,
                        user_id: user.user_id,
                    });
                    break;
                case USER_QUEUE.type.UPDATED:
                    await updateUserService(data.user_id, {
                        avatar: data.avatar,
                        email: data.email,
                        name: data.name,
                        phone_number: data.phone_number,
                        status: data.status,
                        user_types: data.user_types,
                    });
                    break;
            }
        }
    },
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
            const properties = await getNotPendingPropertiesService();

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
