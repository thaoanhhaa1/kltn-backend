import express from 'express';
import envConfig from './configs/env.config';
import errorHandler from './middlewares/error.middleware';
import routes from './routes';

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
    res.send('Hello World!');
});

app.use(envConfig.PREFIX, routes);

app.use(errorHandler);

const PORT = envConfig.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;
