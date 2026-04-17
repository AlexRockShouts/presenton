import time
import logging
import os
from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def download_model(retries=5, delay=5):
    try:
        # Check where the model will be downloaded
        model_instance = ONNXMiniLM_L6_V2()
        logger.info(f"Model download path: {model_instance.DOWNLOAD_PATH}")
        
        # Ensure the directory exists and is writable
        if not os.path.exists(model_instance.DOWNLOAD_PATH):
             logger.info(f"Creating directory {model_instance.DOWNLOAD_PATH}...")
             os.makedirs(model_instance.DOWNLOAD_PATH, exist_ok=True)
        
        for attempt in range(retries):
            try:
                logger.info(f"Attempt {attempt + 1} to download/initialize ONNXMiniLM_L6_V2 model...")
                # This triggers the download and initialization
                # Calling it like this will download if it doesn't exist
                # We call __call__ with dummy data to trigger the actual download process
                model_instance(["hello"])
                logger.info("Model downloaded and initialized successfully.")
                
                # Check if the files are actually there
                extracted_folder = os.path.join(model_instance.DOWNLOAD_PATH, model_instance.EXTRACTED_FOLDER_NAME)
                if os.path.exists(extracted_folder) and os.path.exists(os.path.join(extracted_folder, "model.onnx")):
                    logger.info(f"Verified: Model files exist in {extracted_folder}")
                    return True
                else:
                    logger.warning(f"Warning: Model files not found in expected folder {extracted_folder}")
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {e}")
                if attempt < retries - 1:
                    logger.info(f"Retrying in {delay} seconds...")
                    time.sleep(delay)
                    delay *= 2  # Exponential backoff
                else:
                    logger.error("All attempts failed.")
                    return False
    except Exception as e:
        logger.error(f"Initialization failed: {e}")
        return False

if __name__ == "__main__":
    if not download_model():
        exit(1)
