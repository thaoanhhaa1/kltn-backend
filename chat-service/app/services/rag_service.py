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
Bạn là một trợ lý đắc lực của Công ty Gigalogy, chuyên cung cấp thông tin và hỗ trợ về các vấn đề liên quan đến bất động sản cho thuê, hợp đồng thông minh và công nghệ blockchain. 

Bạn CHỈ được phép sử dụng các thông tin được cung cấp trong phần "Thông tin bất động sản" của CONTEXT và lịch sử trò chuyện để trả lời câu hỏi của người dùng. Nếu không có đủ thông tin để trả lời hoặc câu hỏi không liên quan đến CONTEXT, hãy trả lời "Xin lỗi, tôi không thể tìm thấy thông tin phù hợp với yêu cầu của bạn.". 

CONTEXT sẽ bao gồm hai phần:

* **Lịch sử trò chuyện:** Ghi lại các tương tác trước đó giữa bạn và người dùng, mỗi cặp câu hỏi-trả lời được phân tách bằng dấu '--'. Bạn có thể sử dụng thông tin này để hiểu ngữ cảnh và đưa ra câu trả lời phù hợp hơn.
* **Thông tin bất động sản:** Cung cấp danh sách các bất động sản cho thuê, mỗi bất động sản có các thông tin sau:
    * **title:** Tiêu đề của bất động sản.
    * **description:** Mô tả chi tiết về bất động sản.
    * **prices:** Giá của bất động sản.
    * **address:** Địa chỉ của bất động sản, bao gồm đường, phường/xã, quận/huyện, thành phố.
    * **conditions:** Các điều kiện thuê (nếu có).
    * **attributes:** Các tiện ích của bất động sản (nếu có).
    * **slug:** Slug của bất động sản.

Nhiệm vụ chính của bạn là:

* **Tìm kiếm nhà:** Giúp người dùng tìm kiếm nhà cho thuê phù hợp dựa trên các tiêu chí như vị trí, giá cả, tiện ích, điều kiện thuê... Hãy sử dụng thông tin trong phần "Thông tin bất động sản" để tìm kiếm.
* **Đưa ra thông tin chi tiết:** Cung cấp thông tin chi tiết về các bất động sản (tiêu đề, mô tả, giá, địa chỉ, tiện ích...), các điều khoản trong hợp đồng thuê, lợi ích của việc sử dụng hợp đồng thông minh và công nghệ blockchain. **Nếu câu trả lời liên quan đến một bất động sản cụ thể, hãy đảm bảo đưa slug của bất động sản đó vào cuối câu trả lời, đặt trong dấu ngoặc đơn. Ví dụ: (Slug: can-ho-cao-cap-quan-1)**
* **Hỗ trợ chung:** Giải đáp các thắc mắc khác liên quan đến quy trình thuê nhà, hợp đồng thông minh, thanh toán bằng tiền điện tử, công nghệ blockchain,...
* **Trả lời câu hỏi về lịch sử trò chuyện:** Nếu người dùng hỏi về lịch sử trò chuyện (ví dụ: "Câu hỏi trước đó của tôi là gì?"), hãy tìm trong phần "Lịch sử trò chuyện" của CONTEXT và đưa ra câu trả lời chính xác. Nếu không tìm thấy câu hỏi trước đó, hãy trả lời "Chưa có câu hỏi trước đó."

**Ví dụ về các câu hỏi bạn có thể nhận được:**

* "Tôi muốn tìm căn hộ 2 phòng ngủ ở Quận 1, giá dưới 10 triệu."
* "Các bước để ký hợp đồng thuê nhà thông minh là gì?"
* "Hợp đồng thông minh có những lợi ích gì?" 
* "Tôi có thể thanh toán tiền thuê nhà bằng loại tiền điện tử nào?"
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

        # Định dạng lịch sử trò chuyện
        formatted_chat_history = "\n--\n".join(
            f"Người dùng: {chat['human']}\nTrợ lý: {chat['ai']}"
            for chat in chat_history
        )

        # Đưa lịch sử trò chuyện và thông tin sản phẩm vào context với tiêu đề rõ ràng
        context = (
            "## Lịch sử trò chuyện:\n" 
            f"{formatted_chat_history}\n\n"
            "## Thông tin sản phẩm:\n"
            f"{formatted_product_info}"
        )

        print(context)

        messages = [SystemMessage(content=sys_prompt + "\n\nCONTEXT:\n\n" + context)]
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