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
});

export type Env = z.infer<typeof EnvSchema>;

const env = EnvSchema.safeParse(process.env);

if (!env.success) {
    console.error(env.error.errors);
    process.exit(1);
}

export default env.data;
