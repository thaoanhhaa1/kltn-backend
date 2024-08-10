from app.repositories.qdrant_repository import QdrantRepository
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_qdrant import Qdrant
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from langchain.schema import HumanMessage, SystemMessage
from qdrant_client.http import models as qdrant_models
from app.utils.preprocess_currency import preprocess_currency
import os
import dotenv
import re

# TODO: Chính tả, emoji, lịch sử trò chuyện

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
Bạn là một trợ lý đắc lực, chuyên cung cấp thông tin và hỗ trợ về ứng dụng công nghệ blockchain trong phát triển hệ thống cho thuê nhà và hợp đồng thông minh của Công ty Gigalogy. 

Bạn CHỈ được phép sử dụng các thông tin được cung cấp trong phần "Thông tin bất động sản" của CONTEXT và lịch sử trò chuyện để trả lời câu hỏi của người dùng. **Nếu không có đủ thông tin để trả lời hoặc câu hỏi không liên quan đến CONTEXT, hãy ưu tiên xem xét lịch sử trò chuyện để đưa ra câu trả lời phù hợp. Nếu vẫn không thể trả lời, hãy gợi ý một vài câu hỏi khác liên quan đến các dịch vụ của Gigalogy để hỗ trợ người dùng tốt hơn.**

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
* **Gợi ý câu hỏi:** Khi không có đủ thông tin để trả lời hoặc câu hỏi không liên quan đến CONTEXT, hãy ưu tiên xem xét lịch sử trò chuyện để đưa ra câu trả lời phù hợp. Nếu vẫn không thể trả lời, hãy gợi ý một vài câu hỏi khác liên quan đến các dịch vụ của Gigalogy để hỗ trợ người dùng tốt hơn. Ví dụ:
    * "Bạn có muốn tìm hiểu thêm về cách công nghệ blockchain đảm bảo tính minh bạch và bảo mật cho các giao dịch trên hệ thống của chúng tôi không?"
    * "Bạn có quan tâm đến việc tìm hiểu về các lợi ích của việc thanh toán tiền thuê nhà bằng tiền điện tử không?"
    * "Tôi có thể cung cấp cho bạn thông tin về các dự án bất động sản khác trong khu vực không?"

**Hãy luôn xem xét lịch sử trò chuyện để hiểu ngữ cảnh của câu hỏi hiện tại và đưa ra câu trả lời hoặc gợi ý phù hợp hơn.** 

**Ví dụ về các câu hỏi bạn có thể nhận được:**

* "Tôi muốn tìm căn hộ 2 phòng ngủ ở Quận 1, giá dưới 10 triệu."
* "Các bước để ký hợp đồng thuê nhà thông minh là gì?"
* "Hợp đồng thông minh có những lợi ích gì?" 
* "Tôi có thể thanh toán tiền thuê nhà bằng loại tiền điện tử nào?"
* "Bạn có thể nhắc lại thông tin về căn hộ mà tôi đã hỏi trước đó không?"
* "Câu hỏi trước đó của tôi là gì?"
"""

sys_prompt_question_classification = """
**Phân loại câu hỏi người dùng**

Bạn sẽ nhận được một câu hỏi từ người dùng liên quan đến hệ thống cho thuê nhà. Nhiệm vụ của bạn là phân loại câu hỏi đó vào một trong các loại sau:

* **tìm kiếm nhà:** Nếu câu hỏi liên quan đến việc tìm kiếm thông tin về các căn nhà cho thuê, chẳng hạn như vị trí, giá cả, tiện ích, v.v.
* **kiểm tra hợp đồng:** Nếu câu hỏi liên quan đến thông tin về hợp đồng thuê nhà, chẳng hạn như thời hạn, điều khoản, thanh toán, v.v.
* **xem lịch sử thanh toán:** Nếu câu hỏi liên quan đến việc xem lại lịch sử thanh toán tiền thuê nhà.
* **không rõ ràng:** Nếu không thể xác định rõ ràng loại câu hỏi.

**Hãy chỉ trả về một trong các nhãn trên, không thêm bất kỳ thông tin giải thích nào khác.**

**Ví dụ:**

* **Câu hỏi:** "Tôi muốn tìm một căn hộ 2 phòng ngủ ở quận 3."
* **Phân loại:** tìm kiếm nhà

* **Câu hỏi:** "Hợp đồng của tôi kết thúc khi nào?"
* **Phân loại:** kiểm tra hợp đồng

* **Câu hỏi:** "Tôi đã thanh toán tiền thuê nhà tháng này chưa?"
* **Phân loại:** xem lịch sử thanh toán

* **Câu hỏi:** "Chào bạn, tôi cần giúp đỡ."
* **Phân loại:** không rõ ràng 

**Bây giờ, hãy phân loại câu hỏi sau:**
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
        price_range_match = re.search(r"từ ((\d+(?:\.\d+)?)\s*(?:triệu)?\s*(?:đồng)?) đến ((\d+(?:\.\d+)?)\s*(?:triệu)?\s*(?:đồng)?)", query, re.IGNORECASE)
        min_price_match = re.search(r"(?:trên|lớn hơn|cao hơn)\s+((\d+(?:\.\d+)?)\s*(?:triệu)?\s*(?:đồng)?)", query, re.IGNORECASE)
        max_price_match = re.search(r"(?:dưới|nhỏ hơn|thấp hơn|bé hơn)\s+((\d+(?:\.\d+)?)\s*(?:triệu)?\s*(?:đồng)?)", query, re.IGNORECASE)
        approx_price_match = re.search(r"(?:khoảng|tầm)\s+((\d+(?:\.\d+)?)\s*(?:triệu)?\s*(?:đồng)?)", query, re.IGNORECASE)

        min_price = None
        max_price = None

        if approx_price_match:
            approx_price = self._normalize_price(preprocess_currency(query=query, match=approx_price_match.group(1)))
            tolerance = 0.2
            min_price = approx_price * (1 - tolerance)
            max_price = approx_price * (1 + tolerance)
        elif price_range_match:
            min_price = self._normalize_price(preprocess_currency(query=query, match=price_range_match.group(1)))
            max_price = self._normalize_price(preprocess_currency(query=query, match=price_range_match.group(3)))
        elif min_price_match:
            min_price = self._normalize_price(preprocess_currency(query=query, match=min_price_match.group(1)))
        elif max_price_match:
            max_price = self._normalize_price(preprocess_currency(query=query, match=max_price_match.group(1)))
        
        must_filter = []
        if min_price is not None:
            must_filter.append(qdrant_models.FieldCondition(
                key="metadata.prices",
                range=qdrant_models.Range(
                    gte=min_price
                )
            ))
        if max_price is not None:
            must_filter.append(qdrant_models.FieldCondition(
                key="metadata.prices",
                range=qdrant_models.Range(
                    lte=max_price
                )
            ))

        retriever = self.vector_stores[collection_name].as_retriever(search_kwargs={
            "k": 5, 
            "filter": qdrant_models.Filter(must=must_filter)
        })
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

        # Sửa lỗi định dạng lịch sử trò chuyện
        formatted_chat_history = "\n--\n".join(
            f"Người dùng: {chat['human']}\nTrợ lý: {chat['ai']}"
            for chat in chat_history
        )

        # Đưa lịch sử trò chuyện và thông tin sản phẩm vào context với tiêu đề rõ ràng
        context = (
            "## Lịch sử trò chuyện:\n" 
            f"{formatted_chat_history}\n\n"
            "## Thông tin bất động sản:\n" # Sửa tiêu đề phần thông tin sản
            f"{formatted_product_info}"
        )

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
    
    def classify_question(self, message: str):
        messages = [SystemMessage(content=sys_prompt_question_classification)]
        messages.append(HumanMessage(content=message))

        llm_res = llm.invoke(messages)

        return llm_res.content
    
    def _normalize_price(self, price_str):
        price_str = price_str.lower().replace(".", "").replace(",", "")
        if "triệu" in price_str or "triệu đồng" in price_str:
            return int(price_str.replace("triệu đồng", "").replace("triệu", "").strip()) * 1000000
        if "đồng" in price_str:
            return int(price_str.replace("đồng", "").strip())
        return int(price_str)