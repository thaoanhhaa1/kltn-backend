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
});

export type Env = z.infer<typeof EnvSchema>;

const env = EnvSchema.safeParse(process.env);

if (!env.success) {
    console.error(env.error.errors);
    process.exit(1);
}

export default env.data;
