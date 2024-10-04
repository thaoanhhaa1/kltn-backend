import { Property } from '@prisma/client';
import express from 'express';
import envConfig from './configs/env.config';
import RabbitMQ from './configs/rabbitmq.config';
import { PROPERTY_QUEUE, SYNC_MESSAGE_QUEUE, USER_QUEUE } from './constants/rabbitmq';
import errorHandler from './middlewares/error.middleware';
import routes from './routes';
import { getContractInRangeService } from './services/contract.service';
import { createPropertyService, softDeletePropertyService, updatePropertyService } from './services/property.service';
import TaskService from './services/task.service';
import { createUserService, updateUserService } from './services/user.service';

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
    res.send('Hello World!');
});

app.use(envConfig.PREFIX, routes);

app.use(errorHandler);

const rabbitMQ = RabbitMQ.getInstance();

rabbitMQ.subscribeToQueue({
    name: USER_QUEUE.name,
    exchange: USER_QUEUE.exchange,
    callback: async (message) => {
        if (!message) return;

        const { type, data } = JSON.parse(message.content.toString());

        const userId = data.userId;
        const rest = {
            email: data.email,
            avatar: data.avatar,
            name: data.name,
            status: data.status,
            walletAddress: data.walletAddress,
        };

        try {
            switch (type) {
                case USER_QUEUE.type.CREATED:
                    await createUserService({
                        ...rest,
                        userId: data.userId,
                    });
                    break;
                case USER_QUEUE.type.UPDATED:
                    await updateUserService(userId, rest);
                    break;
            }
        } catch (error) {
            console.error(error);
        }
    },
});

rabbitMQ.subscribeToQueue({
    name: PROPERTY_QUEUE.name,
    exchange: PROPERTY_QUEUE.exchange,
    callback: async (message) => {
        if (!message) return;

        const { type, data } = JSON.parse(message.content.toString());
        console.log('🚀 ~ callback: ~ data:', data);
        const property: Property = data;

        try {
            switch (type) {
                case PROPERTY_QUEUE.type.CREATED:
                    await createPropertyService({
                        propertyId: data.propertyId,
                        title: data.title,
                        images: data.images,
                        slug: data.slug,
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
                        title: data.title,
                        images: data.images,
                        slug: data.slug,
                        status: property.status,
                        deleted: property.deleted,
                        address: data.address,
                    });
                    break;
            }
        } catch (error) {
            console.error(error);
        }
    },
});

rabbitMQ.receiveSyncMessage({
    queue: SYNC_MESSAGE_QUEUE.name,
    callback: async (message) => {
        const { type, data } = JSON.parse(message);

        switch (type) {
            case SYNC_MESSAGE_QUEUE.type.GET_CONTRACT_IN_RANGE:
                const contract = await getContractInRangeService(data);

                return contract;
        }
    },
});

const PORT = envConfig.PORT || 3000;

new TaskService().start();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;
