import pika
import json
import os
from typing import Dict, Optional, Callable

class RabbitMQ:
    _instance: Optional['RabbitMQ'] = None
    _connection: Optional[pika.BlockingConnection] = None
    _channels: Dict[str, pika.channel.Channel]

    def __init__(self):
        self._channels = {}

    @classmethod
    def get_instance(cls) -> 'RabbitMQ':
        if cls._instance is None:
            cls._instance = RabbitMQ()
        return cls._instance

    def connect(self) -> pika.BlockingConnection:
        if not self._connection:
            self._connection = pika.BlockingConnection(
                pika.URLParameters(os.getenv("RABBIT_MQ_URL"))
            )
            # FIXME: Remove this print statement
            print("RabbitMQ connected")
        return self._connection

    def create_channel(self, name: str, exchange: Optional[Dict[str, str]] = None) -> pika.channel.Channel:
        if name not in self._channels:
            connection = self.connect()
            channel = connection.channel()
            
            if exchange:
                channel.exchange_declare(exchange=exchange['name'], exchange_type=exchange['type'], durable=False)
            else:
                channel.queue_declare(queue=name, durable=False)
            
            self._channels[name] = channel
        return self._channels[name]

    def send_to_queue(self, queue: str, message: Dict):
        if queue not in self._channels:
            self.create_channel(name=queue)

        print(f'Sending to queue: {queue}')
        print(f'Message: {message}')

        self._channels[queue].basic_publish(
            exchange='', routing_key=queue, body=json.dumps(message)
        )

    def consume_queue(self, queue: str, callback: Callable[[pika.spec.Basic.Deliver, pika.spec.BasicProperties, bytes], None]):
        if queue not in self._channels:
            self.create_channel(name=queue)

        self._channels[queue].basic_consume(queue=queue, on_message_callback=callback, auto_ack=True)

    def publish_in_queue(self, name: str, exchange: Dict[str, str], message: Dict):
        if name not in self._channels:
            self.create_channel(name=name, exchange=exchange)

        self._channels[name].basic_publish(
            exchange=exchange['name'], routing_key='', body=json.dumps(message)
        )

    def subscribe_to_queue(self, name: str, exchange: Dict[str, str], callback: Callable[[pika.spec.Basic.Deliver, pika.spec.BasicProperties, bytes], None]):
        if name not in self._channels:
            self.create_channel(name=name, exchange=exchange)

        def wrapped_callback(ch, method, properties, body):
            callback(body)

        result = self._channels[name].queue_declare(queue='', exclusive=True)
        queue_name = result.method.queue

        self._channels[name].queue_bind(exchange=exchange['name'], queue=queue_name)
        
        self._channels[name].basic_consume(queue=queue_name, on_message_callback=wrapped_callback, auto_ack=True)

        self._channels[name].start_consuming()
