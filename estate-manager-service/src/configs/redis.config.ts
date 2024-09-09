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
