from fastapi import FastAPI, Request
from app.services.rag_service import RagService
from app.services.chat_service import create_item, get_chats_by_user_id
from app.repositories.qdrant_repository import QdrantRepository
from app.services.rabbitmq_service import RabbitMQService
from app.utils.document import to_document
from app.utils.splitter import split_document
from app.utils.embedding import from_documents
from app.middlewares.auth_middleware import JWTMiddleware
from app.models.chat_model import Chat
import os
import dotenv
import json
import threading

dotenv.load_dotenv()

property_collection = os.getenv("QDRANT_PROPERTY_COLLECTION")

app = FastAPI()

qdrant_repo = QdrantRepository()
rag_service = RagService(qdrant_repo=qdrant_repo, collection_names=[property_collection])
rabbitmq_service = RabbitMQService()

qdrant_repo.create_collection(collection_name=property_collection)

app.add_middleware(JWTMiddleware)

@app.post("/api/v1/chat-service/generate")
async def generate_response(request: Request):
    data = await request.json()
    query = data["query"]

    # FIXME: Uncomment this block to enable the RAG model
    # response = rag_service.classify_question(message=query)

    # if response == "kiểm tra hợp đồng":
    #     return {"response": f"Đã gửi yêu cầu kiểm tra hợp đồng. Vui lòng chờ trong giây lát."}
    
    # if response == "xem lịch sử thanh toán":
    #     return {"response": f"Đã gửi yêu cầu xem lịch sử thanh toán. Vui lòng chờ trong giây lát."}

    user = request.state.user
    user_id = int(user["id"])

    chats = get_chats_by_user_id(user_id=user_id)

    chat_history = []

    for chat in chats:
        chat_history.append({
            "human": chat["request"],
            "ai": chat["response"],
            "source_documents": chat["source_documents"]
        })

    response = rag_service.generate_response(collection_name=property_collection, query=query, chat_history=chat_history)

    chat_res = Chat(
        user_id=user_id, 
        request=query, 
        response=response["result"], 
        source_documents=[document.metadata for document in response["source_documents"]]
    )
    create_item(item=chat_res)

    return {"response": response}

@app.delete("/api/v1/chat-service/{collection_name}/{document_id}")
async def delete_document(collection_name: str, document_id: str):
    qdrant_repo.delete_document(collection_name=collection_name, doc_id=document_id)

    return {"message": "Document deleted successfully"}

@app.get("/api/v1/chat-service/health")
async def health_check():
    return {"status": "ok"}

def property_callback(message):
    data = message.decode("utf-8")
    data_dict = json.loads(data)

    if data_dict["type"] == "PROPERTY_CREATED":
        data_dict = data_dict["data"]
        data_dict["id"] = data_dict["property_id"]

        conditions = "\n".join(f"{condition["condition_type"]}: {condition["condition_value"]}" for condition in data_dict["conditions"])
        attributes = {}

        for attr in data_dict["attributes"]:
            if attr["attribute_type"] not in attributes:
                attributes[attr["attribute_type"]] = []

            attributes[attr["attribute_type"]].append(attr["attribute_name"])

        content = f"""Tiêu đề: {data_dict['title']}\nMô tả: {data_dict['description']}\nĐịa chỉ: {data_dict['address']["street"]}, {data_dict['address']["ward"]}, {data_dict['address']["district"]}, {data_dict['address']["city"]}\n{conditions}\n{"\n".join(f"{k}: {', '.join(v)}" for k, v in attributes.items())}\nGiá: {data_dict['prices']}""";

        property_doc = to_document(data=data_dict, content=content, field_names=[
            "id", "title", "description", "latitude", "longitude", "address", "attributes",
            "images", "conditions", "prices", "owner", "slug"
        ])

        property_split_docs = split_document(property_doc)
        embeddings = from_documents(property_split_docs)
        qdrant_repo.insert_documents(collection_name=property_collection, documents=property_split_docs, embeddings=embeddings)
    elif data_dict["type"] == "PROPERTY_DELETED":
        data_dict = data_dict["data"]

        qdrant_repo.delete_document(collection_name=property_collection, doc_id=data_dict["property_id"])
    elif data_dict["type"] == "PROPERTY_UPDATED":
        # Handle update property
        pass

def worker():
    rabbitmq_service.consume_messages(queue_name=os.getenv("RABBIT_MQ_PROPERTY_QUEUE"), callback=property_callback)

worker_thread = threading.Thread(target=worker)
worker_thread.start()