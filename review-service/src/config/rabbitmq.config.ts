import amqp from 'amqplib/callback_api';

import envConfig from './env.config';
import { USER_QUEUE } from '../constants/rabbitmq';

class RabbitMQ {
    private static instance: RabbitMQ;
    private connection?: amqp.Connection;
    private channels: {
        [key: string]: amqp.Channel;
    };

    private constructor() {
        this.channels = {};
    }

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

    async createChannel({
        exchange,
        name,
    }: {
        name: string;
        exchange?: { name: string; type: string };
    }) {
        if (!this.connection) this.connection = await this.connect();

        return new Promise((resolve, reject) => {
            this.connection!.createChannel((err, channel) => {
                if (err) return reject(err);

                if (exchange) {
                    channel.assertExchange(exchange.name, exchange.type, {
                        durable: false,
                    });
                } else {
                    channel.assertQueue(name, { durable: false });
                }

                this.channels[name] = channel;
                resolve(channel);
            });
        });
    }

    async sendToQueue(queue: string, message: { type: string; data: any }) {
        if (!this.channels[queue]) await this.createChannel({ name: queue });

        console.log('Sending to queue:', queue);
        console.log('Message:', message);

        this.channels[queue]!.sendToQueue(
            queue,
            Buffer.from(JSON.stringify(message)),
        );
    }

    async consumeQueue(
        queue: string,
        callback: (message: amqp.Message | null) => void,
    ) {
        if (!this.channels[queue]) await this.createChannel({ name: queue });

        this.channels[queue]!.consume(queue, callback, {
            noAck: true,
        });
    }

    async publishInQueue({
        exchange,
        message,
        name,
    }: {
        message: { type: string; data: any };
        name: string;
        exchange: { name: string; type: string };
    }) {
        if (!this.channels[name])
            await this.createChannel({
                name,
                exchange,
            });

        this.channels[name]!.publish(
            USER_QUEUE.exchange.name,
            '',
            Buffer.from(JSON.stringify(message)),
        );
    }

    async subscribeToQueue({
        exchange,
        name,
        callback,
    }: {
        name: string;
        exchange: { name: string; type: string };
        callback: (message: amqp.Message | null) => void;
    }) {
        if (!this.channels[name])
            await this.createChannel({
                name,
                exchange,
            });

        this.channels[name]!.assertQueue(
            '',
            { exclusive: true },
            (error, q) => {
                if (error) throw error;

                this.channels[name]!.bindQueue(q.queue, exchange.name, '');

                this.channels[name]!.consume(q.queue, callback, {
                    noAck: true,
                });
            },
        );
    }
}

export default RabbitMQ;
