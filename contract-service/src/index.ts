import { Property, User } from '@prisma/client';
import express from 'express';
import envConfig from './configs/env.config';
import RabbitMQ from './configs/rabbitmq.config';
import { PROPERTY_QUEUE, USER_QUEUE } from './constants/rabbitmq';
import errorHandler from './middlewares/error.middleware';
import routes from './routes';
import { createPropertyService, softDeletePropertyService, updatePropertyService } from './services/property.service';
import { createUserService, updateUserService } from './services/user.service';
import { startAgenda } from './tasks/agenda';

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
                    status: data.status,
                    user_id: data.userId,
                    wallet_address: data.walletAddress,
                });
                break;
            case USER_QUEUE.type.UPDATED:
                await updateUserService(data.userId, {
                    status: data.status,
                    wallet_address: data.walletAddress,
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
                    property_id: data.propertyId,
                    status: property.status,
                    deleted: false,
                    address: data.address,
                });
                break;
            case PROPERTY_QUEUE.type.DELETED:
                await softDeletePropertyService(data.propertyId);
                break;
            case PROPERTY_QUEUE.type.UPDATED:
                await updatePropertyService(data.propertyId, {
                    status: property.status,
                    deleted: property.deleted,
                    address: data.address,
                });
                break;
        }
    },
});

const PORT = envConfig.PORT || 3000;

// Khởi động công việc theo lịch
startAgenda().then(() => {
    console.log('Agenda started and job scheduled.');
}).catch(err => {
    console.error('Error starting agenda:', err);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;
