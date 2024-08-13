def preprocess_currency(query: str, match: str) -> str:
    if f"{match}tr" in query or f"{match} tr" in query:
        return f"{match} triệu"
    
    if f"{match}k" in query or f"{match} k" in query:
        return f"{match}000"
    
    return match