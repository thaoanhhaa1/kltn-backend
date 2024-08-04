import pika
import os
import dotenv

dotenv.load_dotenv()

class RabbitMQService:
    def __init__(self):
        self.connection = pika.BlockingConnection(pika.URLParameters(os.getenv("RABBIT_MQ_URL")))
        self.channel = self.connection.channel()
    
    def declare_queue(self, queue_name):
        self.channel.queue_declare(queue=queue_name)

    def publish_message(self, queue_name, message):
        self.channel.basic_publish(exchange='',
                                  routing_key=queue_name,
                                  body=message)

    def consume_messages(self, queue_name, callback):
        self.channel.queue_declare(queue=queue_name)
        
        def wrapped_callback(ch, method, properties, body):
            callback(body)
        
        self.channel.basic_consume(queue=queue_name, auto_ack=True, on_message_callback=wrapped_callback)
        self.channel.start_consuming()

    async def close(self):
        self.connection.close()