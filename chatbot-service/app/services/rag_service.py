from app.repositories.qdrant_repository import QdrantRepository
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_qdrant import Qdrant
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from langchain.schema import HumanMessage, SystemMessage
from qdrant_client.http import models as qdrant_models
from app.utils.preprocess_currency import preprocess_currency
from app.utils.product_info import document_to_product_info, format_product_infos
import os
import dotenv
import re
from langchain.chains import create_history_aware_retriever
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain.schema.retriever import BaseRetriever

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

* **Tìm kiếm nhà:** Giúp người dùng tìm kiếm nhà cho thuê phù hợp dựa trên các tiêu chí như vị trí, giá cả, tiện ích, điều kiện thuê...
* **Đưa ra thông tin chi tiết:** Cung cấp thông tin chi tiết về các bất động sản (tiêu đề, mô tả, giá, địa chỉ, tiện ích...), các điều khoản trong hợp đồng thuê, lợi ích của việc sử dụng hợp đồng thông minh và công nghệ blockchain. **Nếu câu trả lời liên quan đến một bất động sản cụ thể, hãy đảm bảo đưa slug của bất động sản đó vào cuối câu trả lời, đặt trong dấu ngoặc đơn. Ví dụ: (Slug: can-ho-cao-cap-quan-1)**
* **Hỗ trợ chung:** Giải đáp các thắc mắc khác liên quan đến quy trình thuê nhà, hợp đồng thông minh, thanh toán bằng tiền điện tử, công nghệ blockchain,...

**Hãy luôn xem xét lịch sử trò chuyện để hiểu ngữ cảnh của câu hỏi hiện tại và đưa ra câu trả lời hoặc gợi ý phù hợp hơn.** 

{context}
"""

qa_system_prompt = """Bạn là một trợ lý đắc lực, chuyên cung cấp thông tin và hỗ trợ về ứng dụng công nghệ blockchain trong phát triển hệ thống cho thuê nhà và hợp đồng thông minh của SmartRent. \
Sử dụng các phần ngữ cảnh sau đây để trả lời câu hỏi. \
Nếu bạn không biết câu trả lời, chỉ cần nói rằng bạn không biết. \
Sử dụng tối đa ba câu và giữ cho câu trả lời ngắn gọn.\

Nhiệm vụ chính của bạn là:

* **Tìm nhà:** Giúp người dùng tìm đúng nhà dựa trên các tiêu chí như vị trí, giá cả, tiện nghi, điều khoản tài chính, v.v.
* **Cung cấp thông tin chi tiết:** Cung cấp thông tin chi tiết về bất động sản (tiêu đề, mô tả, giá cả, địa chỉ, tiện nghi, v.v.), các điều khoản đồng thiết kế, lợi ích của việc sử dụng hợp đồng thông minh và công nghệ blockchain. **Nếu câu trả lời liên quan đến bất kỳ sản phẩm nào, hãy đảm bảo đưa slug của bất kỳ bất động sản nào vào câu trả lời cuối cùng, được đặt trong dấu ngoặc đơn. Ví dụ: (Slug: high-end-apartment-in-quan-1)**. Slug lấy từ field "slug" của bất động sản.
* **Hỗ trợ chung:** Trả lời các câu hỏi khác liên quan đến quy trình cho thuê, hợp đồng thông minh, thanh toán bằng tiền điện tử, công nghệ blockchain, v.v.

{context}"""

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

### Contextualize question ###
contextualize_q_system_prompt = """Given a chat history and the latest user question \
which might reference context in the chat history, formulate a standalone question \
which can be understood without the chat history. Do NOT answer the question, \
just reformulate it if needed and otherwise return it as is."""
contextualize_q_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", contextualize_q_system_prompt),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ]
)

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
                key="metadata.price",
                range=qdrant_models.Range(
                    gte=min_price
                )
            ))
        if max_price is not None:
            must_filter.append(qdrant_models.FieldCondition(
                key="metadata.price",
                range=qdrant_models.Range(
                    lte=max_price
                )
            ))

        retriever = self.vector_stores[collection_name].as_retriever(search_kwargs={
            "k": 5, 
            "filter": qdrant_models.Filter(must=must_filter)
        })

        history_docs = []
        for chat in chat_history:
            if 'source_documents' in chat:
                for doc in chat['source_documents']:
                    if doc not in history_docs:
                        history_docs.append(doc)
        
        history_aware_retriever = create_history_aware_retriever(
            llm, retriever, contextualize_q_prompt
        )

        context = '\n'

        for chat in chat_history:
            for page_content in chat['page_contents']:
                context += page_content + '\n'

        prompt = qa_system_prompt + context

        qa_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", prompt),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ]
        )

        question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
        rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

        chat_history_item = ChatMessageHistory()

        for chat in chat_history:
            chat_history_item.add_message({
                "role": "human",
                "content": chat['human'],
            })
            chat_history_item.add_message({
                "role": "ai",
                "content": chat['ai'],
            })

        def get_session_history():
            return chat_history_item

        conversational_rag_chain = RunnableWithMessageHistory(
            rag_chain,
            get_session_history,
            input_messages_key="input",
            history_messages_key="chat_history",
            output_messages_key="answer",
        )

        result = conversational_rag_chain.invoke(
            {"input": query},
            config={"configurable": {"session_id": "1"}}
        )

        properties = []
        slugs = []
        page_contents = []

        for item in result['context']:
            property = item.metadata

            if property['slug'] in result['answer'] and property['slug'] not in slugs:
                properties.append(property)
                page_contents.append(item.page_content)
                slugs.append(property['slug'])


        for i in range(len(chat_history)):
            documents = chat_history[i]['source_documents']

            for j in range(len(documents)):
                if documents[j]['slug'] in result['answer']:
                    properties.append(documents[j])
                    page_contents.append(chat_history[i]['page_contents'][j])
                    slugs.append(documents[j]['slug'])

        return {
            "query": query,
            "result": result['answer'],
            "source_documents": properties,
            "slugs": slugs,
            "page_contents": page_contents
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
