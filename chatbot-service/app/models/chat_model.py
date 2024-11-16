from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from typing import List

class Chat(BaseModel):
    user_id: str
    request: str
    response: str
    source_documents: List
    page_contents: List
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
