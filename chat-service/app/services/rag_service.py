from app.repositories.qdrant_repository import QdrantRepository
from langchain_google_genai import GoogleGenerativeAIEmbeddings
# from langchain.vectorstores import Qdrant
from langchain_qdrant import Qdrant
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from langchain.schema import HumanMessage, SystemMessage
import os
import dotenv

dotenv.load_dotenv()

embeddings = GoogleGenerativeAIEmbeddings(
    model=os.getenv("EMBEDDING_MODEL", "models/embedding-001"),
    google_api_key=os.getenv("GOOGLE_API_KEY")  # Replace with your actual API key
)

llm = ChatGoogleGenerativeAI(
    model=os.getenv("GOOGLE_MODEL", "gemini-pro"), 
    google_api_key=os.getenv("GOOGLE_API_KEY"), 
    temperature=0.9, 
    max_tokens=1024, 
    convert_system_message_to_human=True
)

sys_prompt = """
    You are a helpful assistant to answer and guide for Gigalogy Company. Always answer as helpful and as relevant
    as possible, while being informative. Keep answer length about 100-200 words.
    
    If you don't know the answer to a question, please don't share false information.    
"""

instruction = """CONTEXT:\n\n {context}\n\nQuery: {question}\n"""

prompt_template = sys_prompt + instruction

QA_prompt = PromptTemplate(template=prompt_template, input_variables=["context", "question"])

class RagService:
    def __init__(self, qdrant_repo: QdrantRepository, collection_names):
        self.qdrant_repo = qdrant_repo
        self.vector_stores = {}
        self.qa_chains = {}

        for collection_name in collection_names:
            self.vector_stores[collection_name] = Qdrant(
                client=self.qdrant_repo.client,
                collection_name=collection_name,
                embeddings=embeddings
            )

            self.qa_chains[collection_name] = RetrievalQA.from_chain_type(
                llm=llm,
                chain_type="stuff", 
                retriever=self.vector_stores[collection_name].as_retriever(search_kwargs={"k":3}),
                return_source_documents=True,
                chain_type_kwargs={"prompt":QA_prompt}
            )

    # def generate_response(self, collection_name: str, query: str):
    #     llm_res = self.qa_chains[collection_name].invoke(query)

    #     if llm_res:
    #         return llm_res

    #     return {
    #         "query": query,
    #         "result": "Tôi không biết câu trả lời cho câu hỏi của bạn. Bạn có thể thử lại với câu hỏi khác hoặc liên hệ với bộ phận hỗ trợ của chúng tôi.",
    #         "source_documents": []
    #     }

    def generate_response(self, collection_name: str, query: str):
        # 1. Tìm kiếm sản phẩm phù hợp
        retriever = self.vector_stores[collection_name].as_retriever(search_kwargs={"k": 5}) # Giả sử lấy top 5 kết quả
        docs = retriever.get_relevant_documents(query)

        # 2. Xây dựng thông tin sản phẩm (nếu có)
        product_info = []
        for doc in docs:
            product = doc.metadata
            if product: # Kiểm tra xem có thông tin sản phẩm không
                product_str = f"Tiêu đề: {product.get('title', '')}, Mô tả: {product.get('description', '')}, Giá: {product.get('prices', '')}"
                product_info.append(product_str)

        messages = [
            SystemMessage(content=sys_prompt + "\n\n\n".join(product_info)),
            HumanMessage(content=query),
        ]

        # 4. Gọi LLM để tạo câu trả lời
        llm_res = llm(messages)

        if llm_res:
            return {
                "query": query,
                "result": llm_res.content, 
                "source_documents": docs 
            }
        else:
            return {
                "query": query,
                "result": "Tôi không tìm thấy sản phẩm phù hợp.",
                "source_documents": []
            }