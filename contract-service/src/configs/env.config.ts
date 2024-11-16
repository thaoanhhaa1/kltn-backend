import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
    PORT: z.coerce.number(),
    PREFIX: z.string(),
    DATABASE_URL: z.string(),
    JWT_ACCESS_SECRET: z.string(),
    RABBIT_MQ_URL: z.string(),
    RENTAL_CONTRACT_ADDRESS: z.string(),
    MONGO_CONNECTION: z.string(),
    GANACHE_URL: z.string(),
    COINGECKO_API_KEY: z.string(),
    COINGECKO_ENDPOINT: z.string(),
    KV_REST_API_URL: z.string(),
    KV_REST_API_TOKEN: z.string(),
    BIT_GET_API: z.string(),
    BIT_KAN_API: z.string(),
    INFURA_API_KEY: z.string(),
    CHAIN_ID: z.string(),
    FIREBASE_API_KEY: z.string(),
    FIREBASE_AUTH_DOMAIN: z.string(),
    FIREBASE_AUTH_PROJECT_ID: z.string(),
    FIREBASE_STORAGE_BUCKET: z.string(),
    FIREBASE_MESSAGING_SENDER_ID: z.string(),
    FIREBASE_APP_ID: z.string(),
    FIREBASE_MEASUREMENT_ID: z.string(),
    HOLESKY_PRIVATE_KEY: z.string(),
});

export type Env = z.infer<typeof EnvSchema>;

const env = EnvSchema.safeParse(process.env);

if (!env.success) {
    console.log('Invalid environment variables: ');
    console.error(env.error.errors);
    process.exit(1);
}

export default env.data!;
