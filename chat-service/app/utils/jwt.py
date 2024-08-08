import jwt
import os
import dotenv
from fastapi import HTTPException

dotenv.load_dotenv()

SECRET_KEY = os.getenv("JWT_ACCESS_SECRET")

print("12 - SECRET_KEY", SECRET_KEY)

ALGORITHM = "HS256"  

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
