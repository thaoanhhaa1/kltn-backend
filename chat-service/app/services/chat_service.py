from pymongo import MongoClient
from app.core.config import settings
from app.models.chat_model import Chat
from datetime import datetime

client = MongoClient(settings.MONGO_URL)
db = client[settings.DATABASE_NAME]
collection = db["chat"]

def create_item(item: Chat):
    item.created_at = datetime.now()
    item.updated_at = datetime.now()

    result = collection.insert_one(item.dict())
    return str(result.inserted_id)

def get_item(item_id: str):
    return collection.find_one({"_id": item_id})

def update_item(item_id: str, item: Chat):
    collection.update_one({"_id": item_id}, {"$set": item.dict()})
    return get_item(item_id)

def delete_item(item_id: str):
    return collection.delete_one({"_id": item_id}).deleted_count

def list_items():
    return list(collection.find())

def get_chats_by_user_id(user_id: int, top_k: int = 5):
    return list(collection.find({"user_id": user_id}).sort("updated_at", -1).limit(top_k))