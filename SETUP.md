# Setup project Node + TS + Prisma + Postgres

## Initial project

```bash
npm init -y
```

## Install dependencies

```bash
npm install express dotenv zod prisma @prisma/client
npm install typescript @types/node @types/express ts-node-dev --save-dev
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
