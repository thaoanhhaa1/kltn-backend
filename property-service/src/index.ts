import express from 'express';
import envConfig from './configs/env.config';
import router from './routes';
import errorHandler from './middlewares/error.middleware';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.use(envConfig.PREFIX, router);

app.use(errorHandler);

const PORT = envConfig.PORT || 4003;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
