
import os
import sys
import asyncio
from unittest.mock import MagicMock, patch

# Mock environment variables from the user's k8s deployment
os.environ["HOME"] = "/tmp"
os.environ["APP_DATA_DIRECTORY"] = "/app_data"
os.environ["LLM"] = "custom"
os.environ["CUSTOM_LLM_URL"] = "https://ai-gateway-ssf-sandbox-bit-rhoai-ai-models-sandbox-d.apps.c-tz2-ros-ssfx-npr-01.cloud.admin.ch/v1"
os.environ["CUSTOM_LLM_API_KEY"] = "mock-api-key"
os.environ["CUSTOM_MODEL"] = "mistralai/Mistral-Small-4-119B-2603"
os.environ["CAN_CHANGE_KEYS"] = "false"
os.environ["VERIFY_SSL"] = "false"
os.environ["IMAGE_PROVIDER"] = "pexels"
os.environ["PEXELS_API_KEY"] = "mock-pexels-key"

# Add the FastAPI directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "servers/fastapi"))

async def test_startup():
    print("Testing FastAPI startup logic (lifespan)...")
    
    # Mocking database operations and model listing to avoid real network calls
    with patch("migrations.migrate_database_on_startup", return_value=asyncio.Future()) as mock_migrate:
        mock_migrate.return_value.set_result(None)
        with patch("services.database.create_db_and_tables", return_value=asyncio.Future()) as mock_create_db:
            mock_create_db.return_value.set_result(None)
            with patch("services.database.dispose_engines", return_value=asyncio.Future()) as mock_dispose:
                mock_dispose.return_value.set_result(None)
                with patch("utils.available_models.list_available_openai_compatible_models", return_value=asyncio.Future()) as mock_list_models:
                    # Mocking available models to include the custom model
                    mock_list_models.return_value.set_result(["mistralai/Mistral-Small-4-119B-2603"])
                    
                    from api.lifespan import app_lifespan
                    from fastapi import FastAPI
                    
                    app = FastAPI()
                    try:
                        async with app_lifespan(app):
                            print("Startup successful!")
                    except Exception as e:
                        print(f"Startup failed with error: {e}")
                        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_startup())
