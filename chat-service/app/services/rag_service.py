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
* **Đưa ra thông tin chi tiết:** Cung cấp thông tin chi tiết về các bất động sản (tiêu đề, mô tả, giá, địa chỉ, tiện ích...), các điều khoản trong hợp đồng thuê. **Nếu câu trả lời liên quan đến một sản phẩm cụ thể, hãy đảm bảo đưa slug của sản phẩm đó vào câu trả lời.**
* **Hỗ trợ chung:** Giải đáp các thắc mắc khác liên quan đến quy trình thuê nhà, hợp đồng thông minh, thanh toán,...
* **Sử dụng lịch sử trò chuyện:** Tham khảo lịch sử trò chuyện để hiểu rõ hơn ngữ cảnh và đưa ra câu trả lời phù hợp.
* **Trả lời câu hỏi về lịch sử trò chuyện:** Nếu người dùng hỏi về lịch sử trò chuyện (ví dụ: "Câu hỏi trước đó của tôi là gì?"), hãy tìm trong lịch sử và đưa ra câu trả lời chính xác. Nếu không tìm thấy câu hỏi trước đó, hãy trả lời "Chưa có câu hỏi trước đó."

**Ví dụ về các câu hỏi bạn có thể nhận được:**

* "Tôi muốn tìm căn hộ 2 phòng ngủ ở Quận 1, giá dưới 10 triệu."
* "Các bước để ký hợp đồng thuê nhà thông qua ứng dụng là gì?"
* "Nhà này có bao gồm nội thất không? Nếu có, slug của nó là gì?" 
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
        docs = retriever.invoke(query)

        product_info = []

        for doc in docs:
            product = doc.metadata
            if product:
                attributes_dict = {
                    'Amenity': [],
                    'Highlight': [],
                    'Facility': []
                }

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

        slugs = [product['slug'] for product in product_info]

        if llm_res:
            mentioned_slugs = [slug for slug in slugs if slug in llm_res.content]
            mentioned_slugs = list(set(mentioned_slugs))

            filtered_source_documents = [doc for doc in docs if doc.metadata.get('slug', '') in mentioned_slugs]

            unique_filtered_source_documents = []
            unique_filtered_slugs = []

            for doc in filtered_source_documents:
                if doc.metadata.get('slug', '') not in unique_filtered_slugs:
                    unique_filtered_source_documents.append(doc)
                    unique_filtered_slugs.append(doc.metadata.get('slug', ''))


            return {
                "query": query,
                "result": llm_res.content,
                "source_documents": unique_filtered_source_documents,
                "slugs": unique_filtered_slugs
            }

        return {
            "query": query,
            "result": "Xin lỗi, tôi không thể tìm thấy thông tin phù hợp với yêu cầu của bạn.",
            "source_documents": [],
            "slugs": []
        }