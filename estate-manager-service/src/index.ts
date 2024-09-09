import express from 'express';
import router from './routes';
import envConfig from './configs/env.config';
import errorHandler from './middlewares/error.middleware';
import RabbitMQ from './configs/rabbitmq.config';

const app = express();

RabbitMQ.getInstance().connect();

app.use(express.json());

app.get('/health', (_req, res) => {
    res.send('OK');
});

app.use(envConfig.PREFIX, router);

app.use(errorHandler);

const PORT = envConfig.PORT || 4001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;
