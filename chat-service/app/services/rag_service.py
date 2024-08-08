from app.repositories.qdrant_repository import QdrantRepository
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_qdrant import Qdrant
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from langchain.schema import HumanMessage, SystemMessage, AIMessage
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

Bạn CHỈ được phép sử dụng các thông tin được cung cấp trong CONTEXT và lịch sử trò chuyện để trả lời câu hỏi của người dùng. Nếu không có đủ thông tin để trả lời hoặc câu hỏi không liên quan đến CONTEXT, hãy trả lời "Xin lỗi, tôi không thể tìm thấy thông tin phù hợp với yêu cầu của bạn.". 

CONTEXT sẽ cung cấp cho bạn danh sách các sản phẩm bất động sản, mỗi sản phẩm có các thông tin sau:

* **title:** Tiêu đề của sản phẩm.
* **description:** Mô tả chi tiết về sản phẩm.
* **prices:** Giá của sản phẩm.
* **address:** Địa chỉ của sản phẩm, bao gồm đường, phường/xã, quận/huyện, thành phố.
* **conditions:** Các điều kiện thuê (nếu có).
* **attributes:** Các tiện ích của sản phẩm (nếu có).
* **slug:** Slug của sản phẩm.

Nhiệm vụ chính của bạn là:

* **Tìm kiếm nhà:** Giúp người dùng tìm kiếm nhà cho thuê phù hợp dựa trên các tiêu chí như vị trí, giá cả, tiện ích, điều kiện thuê...
* **Đưa ra thông tin chi tiết:** Cung cấp thông tin chi tiết về các bất động sản (tiêu đề, mô tả, giá, địa chỉ, tiện ích...), các điều khoản trong hợp đồng thuê.
* **Hỗ trợ chung:** Giải đáp các thắc mắc khác liên quan đến quy trình thuê nhà, hợp đồng thông minh, thanh toán,...
* **Sử dụng lịch sử trò chuyện:** Tham khảo lịch sử trò chuyện để hiểu rõ hơn ngữ cảnh và đưa ra câu trả lời phù hợp.
* **Trả lời câu hỏi về lịch sử trò chuyện:** Nếu người dùng hỏi về lịch sử trò chuyện (ví dụ: "Câu hỏi trước đó của tôi là gì?"), hãy tìm trong lịch sử và đưa ra câu trả lời chính xác. Nếu không tìm thấy câu hỏi trước đó, hãy trả lời "Chưa có câu hỏi trước đó."

**Ví dụ về các câu hỏi bạn có thể nhận được:**

* "Tôi muốn tìm căn hộ 2 phòng ngủ ở Quận 1, giá dưới 10 triệu."
* "Các bước để ký hợp đồng thuê nhà thông qua ứng dụng là gì?"
* "Nhà này có bao gồm nội thất không?" 
* "Khi nào thì tôi cần thanh toán tiền thuê nhà?"
* "Bạn có thể nhắc lại thông tin về căn hộ mà tôi đã hỏi trước đó không?"
* "Câu hỏi trước đó của tôi là gì?"
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

    def generate_response(self, collection_name: str, query: str, chat_history: list[dict] = []):
        retriever = self.vector_stores[collection_name].as_retriever(search_kwargs={"k": 5})
        # docs = retriever.get_relevant_documents(query)
        docs = retriever.invoke(query)

        product_info = []
        relevant_data = []  

        for doc in docs:
            product = doc.metadata
            if product:
                # Khởi tạo dictionary để lưu trữ các attributes theo loại
                attributes_dict = {
                    'Amenity': [],
                    'Highlight': [],
                    'Facility': []
                }

                # Phân loại attributes vào đúng danh mục
                for attr in product.get('attributes', []):
                    attr_type = attr['attribute_type']
                    if attr_type in attributes_dict:
                        attributes_dict[attr_type].append(attr['attribute_name'])

                product_info.append({
                    "title": product.get('title', ''),
                    "description": product.get('description', ''),
                    "prices": product.get('prices', ''),
                    "address": {
                        "street": product['address'].get('street', ''),
                        "ward": product['address'].get('ward', ''),
                        "district": product['address'].get('district', ''),
                        "city": product['address'].get('city', '')
                    },
                    "conditions": [f"{cond['condition_type']}: {cond['condition_value']}" for cond in product.get('conditions', [])],
                    "attributes": attributes_dict,  # Sử dụng dictionary đã phân loại
                    "slug": product.get('slug', '')
                })

    # Điều chỉnh format của product_info để hiển thị các loại attributes
        formatted_product_info = "\n\n".join([
            f"**Tiêu đề:** {p['title']}\n"
            f"**Mô tả:** {p['description']}\n"
            f"**Giá:** {p['prices']}\n"
            f"**Địa chỉ:** {p['address']['street']}, {p['address']['ward']}, {p['address']['district']}, {p['address']['city']}\n"
            f"**Điều kiện:** {', '.join(p['conditions'])}\n"
            f"**Tiện ích:** {', '.join(p['attributes'].get('Amenity', []))}\n"
            f"**Điểm nổi bật:** {', '.join(p['attributes'].get('Highlight', []))}\n"
            f"**Cơ sở vật chất:** {', '.join(p['attributes'].get('Facility', []))}\n"
            f"**Slug:** {p['slug']}" 
            for p in product_info
        ])

        messages = [SystemMessage(content=sys_prompt + "\n\n" + formatted_product_info)]  # Sử dụng formatted_product_info

        for chat in chat_history:
            messages.append(HumanMessage(content=chat["human"]))
            messages.append(AIMessage(content=chat["ai"]))

        messages.append(HumanMessage(content=query))

        llm_res = llm.invoke(messages) 

        slugs = [doc.metadata.get('slug', '') for doc in relevant_data]

        if llm_res:
            return {
                "query": query,
                "result": llm_res.content,
                "source_documents": relevant_data,
                "slugs": slugs  # Thêm danh sách slug vào kết quả trả về
            }

        return {
            "query": query,
            "result": "Xin lỗi, tôi không thể tìm thấy thông tin phù hợp với yêu cầu của bạn.",
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