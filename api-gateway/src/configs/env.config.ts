import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
    PORT: z.coerce.number(),
    USER_PREFIX: z.string(),
    USER_SERVICE_URL: z.string().url(),
    PROPERTY_PREFIX: z.string(),
    PROPERTY_SERVICE_URL: z.string().url(),
    CONTRACT_PREFIX: z.string(),
    CONTRACT_SERVICE_URL: z.string().url(),
    CHAT_PREFIX: z.string(),
    CHAT_SERVICE_URL: z.string().url(),
});

export type Env = z.infer<typeof EnvSchema>;

const env = EnvSchema.safeParse(process.env);

if (!env.success) {
    console.error(env.error.errors);
    process.exit(1);
}

export default env.data;
