from fastapi import FastAPI, Request
from app.services.rag_service import RagService
from app.services.chat_service import create_item, get_chats_by_user_id, get_chats_by_user_id_and_pagination
from app.repositories.qdrant_repository import QdrantRepository
from app.services.rabbitmq_service import RabbitMQ
from app.utils.document import to_document
from app.utils.embedding import from_document
from app.middlewares.auth_middleware import JWTMiddleware
from app.models.chat_model import Chat
import os
import dotenv
import json
import threading
from uuid import uuid4

dotenv.load_dotenv()

property_collection = os.getenv("QDRANT_PROPERTY_COLLECTION")

app = FastAPI()

qdrant_repo = QdrantRepository()
rag_service = RagService(qdrant_repo=qdrant_repo, collection_names=[property_collection])
rabbitmq_service = RabbitMQ()

qdrant_repo.create_collection(collection_name=property_collection)

app.add_middleware(JWTMiddleware)

@app.get("/api/v1/chat-service/chats")
async def get_chats(request: Request):
    user = request.state.user
    user_id = (user["id"])
    # get `top_k` in query params
    top_k = int(request.query_params.get("top_k", 5))
    skip = int(request.query_params.get("skip", 0))
    is_pagination = request.query_params.get("pagination", False)

    if is_pagination:
        chats = get_chats_by_user_id_and_pagination(user_id=user_id, top_k=top_k, skip=skip)
    else:
        chats = get_chats_by_user_id(user_id=user_id)

    chat_history = []

    for chat in chats:
        chat_history.append({
            "_id": str(chat["_id"]),
            "query": chat["request"],
            "result": chat["response"],
            "source_documents": chat["source_documents"],
            "page_contents": chat["page_contents"]
        })

    return chat_history

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
    user_id = (user["id"])

    chats = get_chats_by_user_id(user_id=user_id)

    chat_history = []

    for chat in chats:
        chat_history.append({
            # uuid for _id
            "_id": str(uuid4()),
            "human": chat["request"],
            "ai": chat["response"],
            "source_documents": chat["source_documents"],
            "page_contents": chat["page_contents"]
        })

    response = rag_service.generate_response(collection_name=property_collection, query=query, chat_history=chat_history)
    # source_documents=[document.metadata for document in response["source_documents"]]

    chat_res = Chat(
        user_id=user_id, 
        request=query, 
        response=response["result"], 
        source_documents=response["source_documents"],
        page_contents=response["page_contents"]
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
    print("Received message: ", message)

    data = message.decode("utf-8")
    data_dict = json.loads(data)
    type = data_dict["type"]
    data_dict = data_dict["data"]

    if type == "PROPERTY_DELETED" or type == "PROPERTY_UPDATED":
        qdrant_repo.delete_document(collection_name=property_collection, doc_id=data_dict["propertyId"])

    if (type == "PROPERTY_UPDATED" and (data_dict["status"] == "ACTIVE" or data_dict["status"] == "UNAVAILABLE")):
        data_dict["id"] = data_dict["propertyId"]

        conditions = "\n".join(f"{condition["type"]}: {condition["value"]}" for condition in data_dict["rentalConditions"])
        attributes = {}

        for attr in data_dict["attributes"]:
            if attr["type"] not in attributes:
                attributes[attr["type"]] = []

            attributes[attr["type"]].append(attr["name"])

        content = f"""Tiêu đề: {data_dict['title']}\nMô tả: {data_dict['description']}\nLoại nhà: {data_dict['type']["name"]}\nĐịa chỉ: {data_dict['address']["street"]}, {data_dict['address']["ward"]}, {data_dict['address']["district"]}, {data_dict['address']["city"]}\nChủ nhà: {data_dict['owner']['name']}\nEmail: {data_dict['owner']['email']}\nSố điện thoại: {data_dict['owner']['phoneNumber']}\n{conditions}\n{"\n".join(f"{k}: {', '.join(v)}" for k, v in attributes.items())}\nGiá: {data_dict['price']} (Slug: {data_dict['slug']})""";

        property_doc = to_document(data=data_dict, content=content, field_names=[
            "id", "title", "description", "latitude", "longitude", "address", "attributes",
            "images", "rentalConditions", "price", "owner", "slug", "type"
        ])

        # property_split_docs = split_document(property_doc)
        embeddings = from_document(doc=property_doc)

        qdrant_repo.insert_documents(collection_name=property_collection, documents=[property_doc], embeddings=[embeddings])



def worker():
    rabbitmq_service.subscribe_to_queue(name="property-service-property-queue", exchange={
        "name": "property-service-exchange",
        "type": "fanout"
    }, callback=property_callback)

worker_thread = threading.Thread(target=worker)
worker_thread.start()