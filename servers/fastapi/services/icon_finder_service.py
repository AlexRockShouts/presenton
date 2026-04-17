import asyncio
import json
import logging
import os
import chromadb
from chromadb.config import Settings
from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2
from utils.get_env import get_app_data_directory_env


logger = logging.getLogger(__name__)


class IconFinderService:
    def __init__(self):
        self.collection_name = "icons"
        # Chroma DB persistent path (Lives inside the app data directory for PVC persistence)
        chroma_db_dir = os.path.join(get_app_data_directory_env() or "/tmp/presenton", "chroma")
        self.client = chromadb.PersistentClient(
            path=chroma_db_dir, settings=Settings(anonymized_telemetry=False)
        )

    def _initialize_icons_collection(self):
        self.embedding_function = ONNXMiniLM_L6_V2()
        # Removed hardcoded DOWNLOAD_PATH to allow library-patched default (/usr/share/chroma_models)
        # to be used in container environments, preventing unexpected downloads.
        self.embedding_function._download_model_if_not_exists()
        try:
            self.collection = self.client.get_collection(
                self.collection_name, embedding_function=self.embedding_function
            )
        except Exception:
            with open("assets/icons.json", "r") as f:
                icons = json.load(f)

            documents = []
            ids = []

            for i, each in enumerate(icons["icons"]):
                if each["name"].split("-")[-1] == "bold":
                    doc_text = f"{each['name']} {each['tags']}"
                    documents.append(doc_text)
                    ids.append(each["name"])

            if documents:
                self.collection = self.client.create_collection(
                    name=self.collection_name,
                    embedding_function=self.embedding_function,
                    metadata={"hnsw:space": "cosine"},
                )
                self.collection.add(documents=documents, ids=ids)

    async def search_icons(self, query: str, k: int = 1):
        if not hasattr(self, "collection") or self.collection is None:
            logger.info("Initializing icons collection...")
            self._initialize_icons_collection()
            logger.info("Icons collection initialized.")
        logger.debug(f"Searching icons for query: {query}")
        result = await asyncio.to_thread(
            self.collection.query,
            query_texts=[query],
            n_results=k,
        )
        return [f"/static/icons/bold/{each}.svg" for each in result["ids"][0]]


ICON_FINDER_SERVICE = IconFinderService()
