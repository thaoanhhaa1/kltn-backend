import { Client } from '@elastic/elasticsearch';
import fs from 'fs';
import path from 'path';
import envConfig from './env.config';

const elasticClient = new Client({
    // node: 'https://my-elasticsearch-project-b9346e.es.ap-southeast-1.aws.elastic.cloud:443',
    // auth: {
    //     apiKey: 'eXhNOWpaTUJLMEp3Qm4wWGxGeHM6UGc3ZVNsc3BRS1dyVVc0Z2twanM2dw==',
    // },
    node: envConfig.ELASTICSEARCH_URL,
    auth: {
        username: envConfig.ELASTICSEARCH_USERNAME,
        password: envConfig.ELASTICSEARCH_PASSWORD,
    },
    tls: {
        ca: fs.readFileSync(
            path.join(
                __dirname.replace('build\\configs', '').replace('src\\configs', '').replace('build/configs', ''),
                'http_ca.crt',
            ),
        ),
        rejectUnauthorized: false,
    },
});

export default elasticClient;
