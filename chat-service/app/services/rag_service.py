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

# FIXME Change tên web
sys_prompt = """
Bạn là một trợ lý đắc lực của Công ty Gigalogy, chuyên cung cấp thông tin và hỗ trợ về các vấn đề liên quan đến bất động sản và hợp đồng cho thuê. 

Nhiệm vụ chính của bạn là:

* **Tìm kiếm nhà:** Giúp người dùng tìm kiếm nhà cho thuê phù hợp dựa trên các tiêu chí như vị trí, giá cả, tiện ích, điều kiện thuê...
* **Đưa ra thông tin chi tiết:** Cung cấp thông tin chi tiết về các bất động sản (tiêu đề, mô tả, giá, địa chỉ, tiện ích...), các điều khoản trong hợp đồng thuê.
* **Hỗ trợ chung:** Giải đáp các thắc mắc khác liên quan đến quy trình thuê nhà, hợp đồng thông minh, thanh toán,...
* **Lưu ý:** 
    * Luôn trả lời một cách hữu ích và chính xác nhất có thể, đồng thời cung cấp thông tin đầy đủ.
    * Độ dài câu trả lời nên nằm trong khoảng 100-200 từ.
    * Nếu không biết câu trả lời, hãy trung thực và đừng đưa ra thông tin sai lệch.

**Ví dụ về các câu hỏi bạn có thể nhận được:**

* "Tôi muốn tìm căn hộ 2 phòng ngủ ở Quận 1, giá dưới 10 triệu."
* "Các bước để ký hợp đồng thuê nhà thông qua ứng dụng là gì?"
* "Nhà này có bao gồm nội thất không?" 
* "Khi nào thì tôi cần thanh toán tiền thuê nhà?"
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

    def generate_response(self, collection_name: str, query: str):
        retriever = self.vector_stores[collection_name].as_retriever(search_kwargs={"k": 5})
        # docs = retriever.get_relevant_documents(query)
        docs = retriever.invoke(query)

        product_info = []
        relevant_data = []  

        for doc in docs:
            product = doc.metadata
            if product:
                # Thêm slug vào thông tin sản phẩm
                product_str = f"Tiêu đề: {product.get('title', '')}, Mô tả: {product.get('description', '')}, Giá: {product.get('prices', '')}, Slug: {product.get('slug', '')}"  
                product_info.append(product_str)

                if self._is_relevant(product, query):
                    relevant_data.append(doc)

        messages = [
            SystemMessage(content=sys_prompt + "\n\n\n".join(product_info)),
            HumanMessage(content=query),
        ]

        # llm_res = llm(messages)
        llm_res = llm.invoke(messages) 

        # Trích xuất slug từ relevant_data
        slugs = [doc.metadata.get('slug', '') for doc in relevant_data]

        if llm_res and relevant_data:
            return {
                "query": query,
                "result": llm_res.content,
                "source_documents": relevant_data,
                "slugs": slugs  # Thêm danh sách slug vào kết quả trả về
            }
        else:
            return {
                "query": query,
                "result": "Tôi không tìm thấy sản phẩm phù hợp.",
                "source_documents": [],
                "slugs": []
            }

    def _is_relevant(self, product: dict, query: str) -> bool:
        query_lower = query.lower()
        title_lower = product.get('title', '').lower()
        description_lower = product.get('description', '').lower()

        real_estate_keywords = ["nhà", "căn hộ", "phòng trọ", "cho thuê", "mặt bằng", "chung cư", "biệt thự", "villa"]

        # Lấy thông tin vị trí từ địa chỉ
        locations = [product['address']['city'], product['address']['district'], product['address']['ward']]
        location_match = any(location.lower() in query_lower for location in locations)

        price_match = False
        if any(price_keyword in query_lower for price_keyword in ["giá", "tiền thuê", "ngân sách"]):
            try:
                query_price = int(''.join(filter(str.isdigit, query)))
                price_match = product.get('prices') and query_price <= product.get('prices')
            except ValueError:
                pass

        # Lấy thông tin tiện ích từ thuộc tính (attributes)
        amenities = [attr['attribute_name'] for attr in product.get('attributes', []) if attr['attribute_type'] == 'Amenity']
        amenity_match = any(amenity.lower() in query_lower for amenity in amenities)

        # Lấy thông tin điều kiện từ conditions
        conditions = [f"{cond['condition_type']}: {cond['condition_value']}" for cond in product.get('conditions', [])]
        condition_match = any(cond.lower() in query_lower for cond in conditions)

        keyword_match = any(keyword in query_lower for keyword in real_estate_keywords)
        content_match = query_lower in title_lower or query_lower in description_lower

        matching_criteria_count = sum([location_match, price_match, amenity_match, condition_match])

        if matching_criteria_count > 1:
            return location_match and price_match and (amenity_match or condition_match)
        return location_match or price_match or amenity_match or condition_match or keyword_match or content_match