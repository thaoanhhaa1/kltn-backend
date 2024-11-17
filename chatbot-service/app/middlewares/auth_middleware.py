from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from app.utils.jwt import verify_token
from fastapi.responses import JSONResponse

class JWTMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        token = request.headers.get("Authorization")

        if token:
            try:
                token = token.replace("Bearer ", "")
                payload = verify_token(token)
                request.state.user = payload  # Lưu payload vào state của request để sử dụng sau này
            except HTTPException as e:
                return JSONResponse(status_code=e.status_code, content={"detail": e.detail})
        else:
            return JSONResponse(status_code=401, content={"detail": "Authorization header missing"})
        
        response = await call_next(request)
        return response