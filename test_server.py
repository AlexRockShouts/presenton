"""
Presenton Version Server (test/dev stub)

This simulates the remote version-check endpoint that the Electron app polls.
In production, replace UPDATE_SERVER_URL in the Electron app with your hosted URL.

Usage:
    python test_server.py [--port 8765]

Endpoint:
    GET /versions  -> JSON with latest version and download info
"""

import json
import argparse
import logging
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[VersionServer] %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

VERSIONS = {
    "latest": "0.7.0",
    "versions": [
        "0.5.0",
        "0.6.0",
        "0.6.1-beta",
        "0.7.0",
    ],
    "download_url": "https://github.com/presenton/presenton/releases/latest",
    "release_notes": "Bug fixes, performance improvements, and new AI model support.",
}


class VersionHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/versions":
            body = json.dumps(VERSIONS, indent=2).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'{"error": "Not found"}')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()

    def log_message(self, format, *args):
        logger.info(f"{self.address_string()} - {format % args}")


def main():
    parser = argparse.ArgumentParser(description="Presenton version check server")
    parser.add_argument("--port", type=int, default=8765, help="Port to listen on")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to bind to")
    args = parser.parse_args()

    server = HTTPServer((args.host, args.port), VersionHandler)
    logger.info(f"Presenton version server running at http://{args.host}:{args.port}")
    logger.info(f"  GET /versions  -> version information")
    logger.info(f"  Current 'latest' set to: {VERSIONS['latest']}")
    logger.info("Press Ctrl+C to stop.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("\nServer stopped.")


if __name__ == "__main__":
    main()
