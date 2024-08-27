import { Property, User } from '@prisma/client';
import express from 'express';
import envConfig from './configs/env.config';
import RabbitMQ from './configs/rabbitmq.config';
import { PROPERTY_QUEUE, USER_QUEUE } from './constants/rabbitmq';
import errorHandler from './middlewares/error.middleware';
import routes from './routes';
import { createPropertyService, softDeletePropertyService, updatePropertyService } from './services/property.service';
import { createUserService, updateUserService } from './services/user.service';

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
    res.send('Hello World!');
});

app.use(envConfig.PREFIX, routes);

app.use(errorHandler);

RabbitMQ.getInstance().subscribeToQueue({
    name: USER_QUEUE.name,
    exchange: USER_QUEUE.exchange,
    callback: async (message) => {
        if (!message) return;

        const { type, data } = JSON.parse(message.content.toString());
        const user: User = data;

        switch (type) {
            case USER_QUEUE.type.CREATED:
                await createUserService({
                    status: user.status,
                    user_id: user.user_id,
                    wallet_address: user.wallet_address,
                });
                break;
            case USER_QUEUE.type.UPDATED:
                await updateUserService(user.user_id, {
                    status: user.status,
                    wallet_address: user.wallet_address,
                });
                break;
        }
    },
});

RabbitMQ.getInstance().subscribeToQueue({
    name: PROPERTY_QUEUE.name,
    exchange: PROPERTY_QUEUE.exchange,
    callback: async (message) => {
        if (!message) return;

        const { type, data } = JSON.parse(message.content.toString());
        console.log('Message:', message);
        const property: Property = data;

        switch (type) {
            case PROPERTY_QUEUE.type.CREATED:
                await createPropertyService({
                    property_id: property.property_id,
                    status: property.status,
                    address_id: property.address_id,
                    deleted: false,
                    address: data.address,
                });
                break;
            case PROPERTY_QUEUE.type.DELETED:
                await softDeletePropertyService(property.property_id);
                break;
            case PROPERTY_QUEUE.type.UPDATED:
                await updatePropertyService(property.property_id, {
                    status: property.status,
                    deleted: property.deleted,
                    address_id: property.address_id,
                    address: data.address,
                });
                break;
        }
    },
});

const PORT = envConfig.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;
