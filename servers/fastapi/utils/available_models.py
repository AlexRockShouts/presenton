import logging
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from google import genai
import httpx
from utils.get_env import get_verify_ssl_env
from utils.parsers import parse_bool_or_none


logger = logging.getLogger(__name__)


def _get_httpx_client() -> httpx.AsyncClient:
    verify = parse_bool_or_none(get_verify_ssl_env())
    if verify is None:
        verify = get_verify_ssl_env() or True
    return httpx.AsyncClient(verify=verify, timeout=httpx.Timeout(connect=90.0, read=90.0, write=90.0, pool=90.0))


async def list_available_openai_compatible_models(url: str, api_key: str) -> list[str]:
    async with _get_httpx_client() as http_client:
        client = AsyncOpenAI(api_key=api_key, base_url=url, http_client=http_client)
        try:
            # Some non-standard gateways (like BIT RHOAI) might require a model parameter
            # even for listing models. If it fails, we gracefully return an empty list.
            models = (await client.models.list()).data
            if models:
                ids = list(map(lambda x: x.id, models))
                logger.debug(f"Discovered models from {url}: {ids}")
                return ids
        except Exception as e:
            logger.warning(
                f"Failed to list models from {url}: {e}. "
                "This is often due to non-standard API implementations and will be ignored."
            )
    return []


async def list_available_anthropic_models(api_key: str) -> list[str]:
    async with _get_httpx_client() as http_client:
        client = AsyncAnthropic(api_key=api_key, http_client=http_client)
        try:
            ids = list(map(lambda x: x.id, (await client.models.list(limit=50)).data))
            logger.debug(f"Discovered Anthropic models: {ids}")
            return ids
        except Exception as e:
            logger.warning(f"Failed to list Anthropic models: {e}")
    return []


async def list_available_google_models(api_key: str) -> list[str]:
    try:
        client = genai.Client(api_key=api_key)
        ids = list(map(lambda x: x.name, client.models.list(config={"page_size": 50})))
        logger.debug(f"Discovered Google models: {ids}")
        return ids
    except Exception as e:
        logger.warning(f"Failed to list Google models: {e}")
    return []
