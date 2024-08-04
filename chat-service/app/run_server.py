import uvicorn
import os
import dotenv

dotenv.load_dotenv()

host = "0.0.0.0"
port = int(os.getenv("PORT", 8000))

if __name__ == "__main__":
    uvicorn.run(
        "app.api.main:app",
        host=host,
        port=port,
        reload=True
    )
