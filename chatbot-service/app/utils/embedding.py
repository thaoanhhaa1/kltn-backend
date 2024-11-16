from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os
import dotenv

dotenv.load_dotenv()

def from_document(doc):
    return from_documents([doc])[0]

def from_documents(docs):
    embeddingsModel = GoogleGenerativeAIEmbeddings(
        model=os.getenv("EMBEDDING_MODEL", "models/embedding-001"),
        google_api_key=os.getenv("GOOGLE_API_KEY")  # Replace with your actual API key
    )

    # Generate embeddings
    embeddings = embeddingsModel.embed_documents([doc.page_content for doc in docs])

    return embeddings