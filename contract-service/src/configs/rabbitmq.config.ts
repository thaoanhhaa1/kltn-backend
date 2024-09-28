import amqp from 'amqplib/callback_api';
import { v4 as uuidv4 } from 'uuid';
import envConfig from './env.config';

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

    async createChannel({ exchange, name }: { name: string; exchange?: { name: string; type: string } }) {
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

        this.channels[queue]!.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
    }

    async consumeQueue(queue: string, callback: (message: amqp.Message | null) => void) {
        if (!this.channels[queue]) await this.createChannel({ name: queue });

        this.channels[queue]!.consume(queue, callback, {
            noAck: true,
        });
    }

    async consumeQueueWithAck(queue: string, callback: (message: amqp.Message | null) => Promise<void>) {
        if (!this.channels[queue]) await this.createChannel({ name: queue });

        this.channels[queue]!.consume(
            queue,
            async (message) => {
                if (message) {
                    try {
                        await callback(message);
                        // Xác nhận thông điệp đã được xử lý thành công
                        this.channels[queue]!.ack(message);
                    } catch (error) {
                        console.error(`Error processing message from queue ${queue}:`, error);
                        // Không xác nhận thông điệp, thông điệp sẽ được gửi lại vào hàng đợi
                        this.channels[queue]!.nack(message, false, true);
                    }
                }
            },
            {
                noAck: false, // Sử dụng xác nhận thủ công
            },
        );
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

        this.channels[name]!.publish(exchange.name, '', Buffer.from(JSON.stringify(message)));
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

        this.channels[name]!.assertQueue('', { exclusive: true }, (error, q) => {
            if (error) throw error;

            this.channels[name]!.bindQueue(q.queue, exchange.name, '');

            this.channels[name]!.consume(q.queue, callback, {
                noAck: true,
            });
        });
    }

    assertQueue(channel: amqp.Channel, queue: string, options?: amqp.Options.AssertQueue) {
        return new Promise((resolve, reject) => {
            channel.assertQueue(queue, options, (err, q) => {
                if (err) return reject(err);

                resolve(q);
            });
        });
    }

    async sendSyncMessage<T>({
        queue,
        message,
    }: {
        queue: string;
        message: {
            type: string;
            data?: T;
        };
    }): Promise<string> {
        if (!this.channels[queue]) await this.createChannel({ name: queue });

        const channel = this.channels[queue];

        const replyQueue = (await this.assertQueue(channel, '', { exclusive: true })) as amqp.Replies.AssertQueue;
        const correlationId = uuidv4();

        return new Promise((resolve, reject) => {
            channel.consume(
                replyQueue.queue,
                (msg) => {
                    if (msg?.properties.correlationId === correlationId) {
                        resolve(msg.content.toString());
                    }
                },
                { noAck: true },
            );

            channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
                correlationId,
                replyTo: replyQueue.queue,
            });
        });
    }

    async receiveSyncMessage<T>({ queue, callback }: { queue: string; callback: (message: string) => Promise<T> }) {
        if (!this.channels[queue]) await this.createChannel({ name: queue });

        const channel = this.channels[queue];

        await this.assertQueue(channel, queue, { durable: false });
        channel.prefetch(1);

        channel.consume(queue, async (msg: amqp.Message | null) => {
            if (msg) {
                const message = msg.content.toString();

                const result = await callback(message);

                channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(result)), {
                    correlationId: msg.properties.correlationId,
                });

                channel.ack(msg);
            }
        });
    }
}

export default RabbitMQ;
