import uvicorn
import argparse
from utils.get_env import get_log_level_env

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the FastAPI server")
    parser.add_argument(
        "--port", type=int, required=True, help="Port number to run the server on"
    )
    parser.add_argument(
        "--reload", type=str, default="false", help="Reload the server on code changes"
    )
    args = parser.parse_args()
    reload = args.reload == "true"
    log_level = get_log_level_env().lower()
    
    uvicorn.run(
        "api.main:app",
        host="127.0.0.1",
        port=args.port,
        log_level=log_level,
        reload=reload,
    )
