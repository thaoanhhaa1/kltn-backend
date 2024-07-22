import express from 'express';
import envConfig from './configs/env.config';
import RabbitMQ from './configs/rabbitmq.config';
import { USER_QUEUE } from './constants/rabbitmq';
import { ICreateUserReq } from './interfaces/user';
import errorHandler from './middlewares/error.middleware';
import router from './routes';
import { createUser } from './services/user.service';

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
    res.send('Hello World!');
});

app.use(envConfig.PREFIX, router);

app.use(errorHandler);

RabbitMQ.getInstance().consumeQueue(async (message) => {
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

const PORT = envConfig.PORT || 4003;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
