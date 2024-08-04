import express from 'express';
import RabbitMQ from './config/rabbitmq.config';
import { USER_QUEUE } from './constants/rabbitmq';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

RabbitMQ.getInstance().subscribeToQueue({
    exchange: USER_QUEUE.exchange,
    name: USER_QUEUE.name,
    callback: (msg) => {
        if (!msg) return;

        console.log('Received message:', msg.content.toString());
    },
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;
