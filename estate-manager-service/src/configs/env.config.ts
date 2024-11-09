import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
    PORT: z.coerce.number(),
    PREFIX: z.string(),
    JWT_ACCESS_SECRET: z.string(),
    JWT_ACCESS_EXPIRATION: z.coerce.number(),
    JWT_REFRESH_SECRET: z.string(),
    JWT_REFRESH_EXPIRATION: z.coerce.number(),
    RABBIT_MQ_URL: z.string(),
    GMAIL_USER: z.string(),
    GMAIL_PASSWORD: z.string(),
    FE_URL: z.string().url(),
    KV_REST_API_TOKEN: z.string(),
    KV_REST_API_URL: z.string().url(),
    OTP_EXPIRATION: z.coerce.number(),
    FIREBASE_API_KEY: z.string(),
    FIREBASE_AUTH_DOMAIN: z.string(),
    FIREBASE_AUTH_PROJECT_ID: z.string(),
    FIREBASE_STORAGE_BUCKET: z.string(),
    FIREBASE_MESSAGING_SENDER_ID: z.string(),
    FIREBASE_APP_ID: z.string(),
    FIREBASE_MEASUREMENT_ID: z.string(),
    ELASTICSEARCH_URL: z.string().url(),
    ELASTICSEARCH_USERNAME: z.string(),
    ELASTICSEARCH_PASSWORD: z.string(),
    FPT_API_KEY: z.string(),
    FPT_ENDPOINT: z.string().url(),
});

export type Env = z.infer<typeof EnvSchema>;

const env = EnvSchema.safeParse(process.env);

if (!env.success) {
    console.log('Invalid environment variables: ');
    console.error(env.error.errors);
    process.exit(1);
}

export default env.data;
