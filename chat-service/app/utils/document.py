from langchain.docstore.document import Document

def to_document(data, content, field_names):
    doc = Document(
        page_content=content,
        metadata={k: data.get(k) for k in field_names},
    )

    return doc

def to_documents(data, content, field_names):
    return [to_document(d, content, field_names) for d in data]