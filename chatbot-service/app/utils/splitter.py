from langchain.text_splitter import RecursiveCharacterTextSplitter

text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
    chunk_size=512, chunk_overlap=256
)

def split_document(data):
    docs = text_splitter.transform_documents([data])

    return docs

def split_documents(data):
    docs = text_splitter.transform_documents(data)

    return docs