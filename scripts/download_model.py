import time
import logging
from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def download_model(retries=5, delay=5):
    for attempt in range(retries):
        try:
            logger.info(f"Attempt {attempt + 1} to download ONNXMiniLM_L6_V2 model...")
            # This triggers the download and initialization
            ONNXMiniLM_L6_V2()
            logger.info("Model downloaded and initialized successfully.")
            return True
        except Exception as e:
            logger.error(f"Attempt {attempt + 1} failed: {e}")
            if attempt < retries - 1:
                logger.info(f"Retrying in {delay} seconds...")
                time.sleep(delay)
                delay *= 2  # Exponential backoff
            else:
                logger.error("All attempts failed.")
                return False

if __name__ == "__main__":
    if not download_model():
        exit(1)
