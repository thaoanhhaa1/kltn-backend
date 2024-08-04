from qdrant_client import QdrantClient, http
from qdrant_client.http import models
import os
import dotenv
import uuid

dotenv.load_dotenv()

class QdrantRepository:
    def __init__(self):
        api_key = os.getenv("QDRANT_API_KEY")
        url = os.getenv("QDRANT_URL")

        self.client = QdrantClient(url=url, api_key=api_key)

    def create_collection(self, collection_name):
        # vectors_config = http.models.VectorParams(
        #     size=768, # Size of the vector
        #     distance=http.models.Distance.COSINE
        # )

        # self.client.recreate_collection(
        #     collection_name=collection_name,
        #     vectors_config=vectors_config
        # )
        collections = self.client.get_collections().collections
        if collection_name not in [col.name for col in collections]:
            vectors_config = http.models.VectorParams(
                size=768, 
                distance=http.models.Distance.COSINE
            )
            self.client.recreate_collection(
                collection_name=collection_name,
                vectors_config=vectors_config
            )
            print(f"Collection '{collection_name}' created.")  # Indicate success
        else:
            print(f"Collection '{collection_name}' already exists.")

    def insert_documents(self, collection_name, documents, embeddings):
        self.client.upsert(
            collection_name=collection_name,
            points=[
                {
                    "id": uuid.uuid4().hex,
                    "vector": embedding,
                    "payload": {
                        "page_content": doc.page_content,
                        "metadata": doc.metadata, 
                    }
                }
                for i, (doc, embedding) in enumerate(zip(documents, embeddings))
            ]
        )
    
    def insert_document(self, collection_name, document, embedding):
        self.insert_documents(collection_name, [document], [embedding])

    def search(self, collection_name, query, top_k=10):
        return self.client.search(
            collection_name=collection_name,
            query_vector=query,
            top_k=top_k
        )
    
    def delete_collection(self, collection_name):
        self.client.delete_collection(collection_name=collection_name)

    def delete_document(self, collection_name, doc_id):
        self.client.delete(
            collection_name=collection_name,
            points_selector=models.Filter(
                must=[
                    models.FieldCondition(
                        key="metadata.id",
                        match=models.MatchValue(value=doc_id)
                    )
                ]
            )
        )