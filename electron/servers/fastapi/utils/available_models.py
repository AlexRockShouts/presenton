from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from google import genai
import httpx
from utils.get_env import get_verify_ssl_env
from utils.parsers import parse_bool_or_none


def _get_httpx_client() -> httpx.AsyncClient:
    verify = parse_bool_or_none(get_verify_ssl_env())
    if verify is None:
        verify = get_verify_ssl_env() or True
    return httpx.AsyncClient(verify=verify, timeout=httpx.Timeout(connect=90.0, read=90.0))


async def list_available_openai_compatible_models(url: str, api_key: str) -> list[str]:
    async with _get_httpx_client() as http_client:
        client = AsyncOpenAI(api_key=api_key, base_url=url, http_client=http_client)
        models = (await client.models.list()).data
        if models:
            return list(map(lambda x: x.id, models))
    return []


async def list_available_anthropic_models(api_key: str) -> list[str]:
    async with _get_httpx_client() as http_client:
        client = AsyncAnthropic(api_key=api_key, http_client=http_client)
        return list(map(lambda x: x.id, (await client.models.list(limit=50)).data))


async def list_available_google_models(api_key: str) -> list[str]:
    client = genai.Client(api_key=api_key)
    return list(map(lambda x: x.name, client.models.list(config={"page_size": 50})))
