import { Client } from '@elastic/elasticsearch';
import fs from 'fs';
import path from 'path';
import envConfig from './env.config';

const elasticClient = new Client({
    node: envConfig.ELASTICSEARCH_URL,
    auth: {
        username: envConfig.ELASTICSEARCH_USERNAME,
        password: envConfig.ELASTICSEARCH_PASSWORD,
    },
    tls: {
        ca: fs.readFileSync(path.join(__dirname.replace('build\\src\\configs', ''), 'http_ca.crt')),
        rejectUnauthorized: false,
    },
});

export default elasticClient;
