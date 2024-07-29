# Setup project Node + TS + Prisma + Postgres

## Initial project

```bash
npm init -y
```

## Install dependencies

```bash
npm install express dotenv zod prisma @prisma/client jsonwebtoken
npm install typescript @types/node @types/express ts-node-dev @types/jsonwebtoken --save-dev
```

## Create tsconfig.json

```bash
npx tsc --init
```

## Setup Prisma

```bash
npx prisma init
```

-   Update the `schema.prisma` file and `DATABASE_URL` in `.env` file

## Create database

```bash
npx prisma db push
```

## Generate Prisma client

```bash
npx prisma generate
```

## Create a migration

```bash
npx prisma migrate dev --name init
```

## Create express server

```typescript
import express from 'express';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
```

## Add scripts to package.json

```json
"scripts": {
    "dev": "ts-node-dev src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
}
```

## Create db by prisma

```bash
npx prisma migrate dev --name init
```

# Setup RabbitMQ

## Install dependencies

```bash
npm i amqplib
npm i @types/amqplib
```

## .env file

```env
RABBIT_MQ_URL=<URL>
```

## RabbitMQ class

```typescript
import amqp from 'amqplib/callback_api';

import envConfig from './env.config';

class RabbitMQ {
    private static instance: RabbitMQ;
    private connection?: amqp.Connection;
    private channel?: amqp.Channel;

    private constructor() {}

    static getInstance(): RabbitMQ {
        if (!this.instance) {
            this.instance = new RabbitMQ();
        }
        return this.instance;
    }

    async connect(): Promise<amqp.Connection> {
        return new Promise((resolve, reject) => {
            amqp.connect(envConfig.RABBIT_MQ_URL, (err, connection) => {
                if (err) return reject(err);

                this.connection = connection;

                console.log('RabbitMQ connected');
                resolve(connection);
            });
        });
    }

    async createChannel() {
        if (!this.connection) this.connection = await this.connect();

        return new Promise((resolve, reject) => {
            this.connection!.createChannel((err, channel) => {
                if (err) return reject(err);

                this.channel = channel;
                resolve(channel);
            });
        });
    }

    async publishInQueue(
        queue: string,
        message: {
            type: string;
            data: any;
        },
    ) {
        if (!this.channel) await this.createChannel();

        this.channel!.assertQueue(queue, { durable: false });
        this.channel!.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
    }

    async consumeQueue(
        queue: string,
        callback: (message: amqp.Message | null) => void,
    ) {
        if (!this.channel) await this.createChannel();

        this.channel!.assertQueue(queue, { durable: false });
        this.channel!.consume(queue, callback, { noAck: true });
    }
}

export default RabbitMQ;
```

## Constant

```typescript
export const USER_QUEUE = {
    name: 'user-service-user-queue',
    type: {
        CREATED: 'USER_CREATED',
        UPDATED: 'USER_UPDATED',
        DELETED: 'USER_DELETED',
    },
};
```

# Setup Redis

## Install dependencies

```bash
npm i @vercel/kv
```

## .env file

```env
KV_REST_API_URL=<KV_REST_API_URL>
KV_REST_API_TOKEN=<KV_REST_API_TOKEN>
```

## config/redis.config.ts

```typescript
import envConfig from './env.config';
import { createClient } from '@vercel/kv';

class Redis {
    private static instance: Redis;
    private client: any;

    private constructor() {
        this.client = createClient({
            url: envConfig.KV_REST_API_URL,
            token: envConfig.KV_REST_API_TOKEN,
        });
    }

    public getClient() {
        return this.client;
    }

    public static getInstance() {
        if (!Redis.instance) Redis.instance = new Redis();

        return Redis.instance;
    }
}

export default Redis;
```

# Elasticsearch

## Docs

https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html

## Run Elasticsearch

```bash
docker compose -f .\docker-compose.yml up
```

## Get http_ca.crt file to connect to Elasticsearch

```bash
docker cp elasticsearch:/usr/share/elasticsearch/config/certs/http_ca.crt .
```

## Copy file to service use Elasticsearch

```bash
cp .\http_ca.crt .\<Service>\src\configs\
```

## Use Kibana

-   Delete network

```bash
docker network rm <NameOfCompose>_elastic
```

-   Delete container

```bash
docker rm elasticsearch kib01
```

-   Delete volume

```bash
docker volume rm <NameOfCompose>_elasticsearch-data
```

-   Run Kibana

```bash
docker run --name kib01 --net <NameOfCompose>_elastic -p 5601:5601 docker.elastic.co/kibana/kibana:8.14.3
```

-   Create token

```bash
docker exec -it elasticsearch /usr/share/elasticsearch/bin/elasticsearch-create-enrollment-token -s kibana
```

-   Access to Kibana with created token (Code in terminal of kibana)

```bash
    http://localhost:5601/
```
