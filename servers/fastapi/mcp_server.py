import sys
import argparse
import asyncio
import traceback
import logging

import httpx
from fastmcp import FastMCP
import json

logger = logging.getLogger(__name__)

with open("openai_spec.json", "r") as f:
    openapi_spec = json.load(f)


async def main():
    try:
        logger.debug("MCP (OpenAPI) Server startup initiated")
        parser = argparse.ArgumentParser(
            description="Run the MCP server (from OpenAPI)"
        )
        parser.add_argument(
            "--port", type=int, default=8001, help="Port for the MCP HTTP server"
        )

        parser.add_argument(
            "--name",
            type=str,
            default="Presenton API (OpenAPI)",
            help="Display name for the generated MCP server",
        )
        args = parser.parse_args()
        logger.debug(f"Parsed args - port={args.port}")

        # Create an HTTP client that the MCP server will use to call the API
        api_client = httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=90.0)

        # Build MCP server from OpenAPI
        logger.debug("Creating FastMCP server from OpenAPI spec...")
        mcp = FastMCP.from_openapi(
            openapi_spec=openapi_spec,
            client=api_client,
            name=args.name,
        )
        logger.debug("MCP server created from OpenAPI successfully")

        # Start the MCP server
        uvicorn_config = {"reload": True}
        logger.debug(f"Starting MCP server on host=127.0.0.1, port={args.port}")
        await mcp.run_async(
            transport="http",
            host="127.0.0.1",
            port=args.port,
            uvicorn_config=uvicorn_config,
        )
        logger.debug("MCP server run_async completed")
    except Exception as e:
        logger.error(f"MCP server startup failed: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise


if __name__ == "__main__":
    # Basic logging config for when run directly
    logging.basicConfig(level=logging.DEBUG)
    logger.debug("Starting MCP (OpenAPI) main function")
    try:
        asyncio.run(main())
    except Exception as e:
        logger.critical(f"FATAL ERROR: {e}")
        logger.critical(f"FATAL TRACEBACK: {traceback.format_exc()}")
        sys.exit(1)
