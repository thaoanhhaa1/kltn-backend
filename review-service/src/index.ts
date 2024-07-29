import express from 'express';
import RabbitMQ from './config/rabbitmq.config';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

RabbitMQ.getInstance().consumeQueue((message) => {
    console.log('Message received:', message?.content.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;
