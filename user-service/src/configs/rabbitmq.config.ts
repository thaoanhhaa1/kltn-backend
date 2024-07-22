import amqp from 'amqplib/callback_api';

import envConfig from './env.config';
import { USER_QUEUE } from '../constants/rabbitmq';

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

                // FIXME: Remove this console.log
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

                channel.assertExchange(USER_QUEUE.exchange.name, USER_QUEUE.exchange.type, {
                    durable: false,
                });

                this.channel = channel;
                resolve(channel);
            });
        });
    }

    async publishInQueue(message: { type: string; data: any }) {
        if (!this.channel) await this.createChannel();

        this.channel!.publish(USER_QUEUE.exchange.name, '', Buffer.from(JSON.stringify(message)));
    }

    async consumeQueue(callback: (message: amqp.Message | null) => void) {
        if (!this.channel) await this.createChannel();

        this.channel!.assertQueue('', { exclusive: true }, (error, q) => {
            if (error) throw error;

            this.channel!.bindQueue(q.queue, USER_QUEUE.exchange.name, '');

            this.channel!.consume(q.queue, callback, {
                noAck: true,
            });
        });
    }
}

export default RabbitMQ;
