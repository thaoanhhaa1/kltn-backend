import cors from 'cors';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import envConfig from './configs/env.config';
import errorHandler from './middlewares/error.middleware';

const app = express();

app.get('/health', (_req, res) => {
    res.send('OK');
});

app.use(
    cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }),
);

const {
    USER_PREFIX,
    USER_SERVICE_URL,
    PROPERTY_PREFIX,
    PROPERTY_SERVICE_URL,
    CONTRACT_PREFIX,
    CONTRACT_SERVICE_URL,
    CHAT_PREFIX,
    CHAT_SERVICE_URL,
} = envConfig;

app.use(
    USER_PREFIX,
    createProxyMiddleware({
        target: USER_SERVICE_URL,
        changeOrigin: true,
        logger: console,
    }),
);

app.use(
    PROPERTY_PREFIX,
    createProxyMiddleware({
        target: PROPERTY_SERVICE_URL,
        changeOrigin: true,
        logger: console,
    }),
);

app.use(
    CONTRACT_PREFIX,
    createProxyMiddleware({
        target: CONTRACT_SERVICE_URL,
        changeOrigin: true,
        logger: console,
    }),
);

app.use(
    CHAT_PREFIX,
    createProxyMiddleware({
        target: CHAT_SERVICE_URL,
        changeOrigin: true,
        logger: console,
    }),
);

app.use(errorHandler);

app.get('*', (_req, res) => {
    res.status(404).json({ message: 'Not Found Resource' });
});

const PORT = envConfig.PORT || 4000;
app.use(express.json());
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});

export default app;
