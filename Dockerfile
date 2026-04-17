# Stage 1: Next.js Builder
FROM node:20-slim AS next-builder
WORKDIR /app/servers/nextjs
COPY servers/nextjs/package.json servers/nextjs/package-lock.json ./
RUN npm ci

COPY servers/nextjs/ ./
RUN npm run build && \
    npm prune --production

# Stage 2: Final Image
FROM python:3.11-slim-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    curl \
    libreoffice \
    fontconfig \
    chromium \
    zstd \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && curl -fsSL https://ollama.com/install.sh | sh \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set environment variables
ENV APP_DATA_DIRECTORY=/app_data \
    TEMP_DIRECTORY=/tmp/presenton \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    OLLAMA_MODELS=/app_data/.ollama/models \
    HOME=/app_data

# Install Python dependencies
# docling is large, we install it with --no-cache-dir to save space
RUN pip install --no-cache-dir \
    alembic aiohttp aiomysql aiosqlite asyncpg fastapi[standard] \
    pathvalidate pdfplumber chromadb sqlmodel \
    anthropic google-genai openai fastmcp dirtyjson \
    && pip install --no-cache-dir docling --extra-index-url https://download.pytorch.org/whl/cpu

# Copy Next.js app from builder
COPY --from=next-builder /app/servers/nextjs /app/servers/nextjs

# Copy FastAPI and other files
COPY servers/fastapi/ ./servers/fastapi/
COPY start.js LICENSE NOTICE ./
COPY nginx.conf /etc/nginx/nginx.conf

# Setup permissions for rootless execution and OpenShift
# We pre-create some common directories in /app_data to ensure they have the right permissions
RUN mkdir -p /app_data/.cache /app_data/.config /app_data/.local /app_data/.ollama /app_data/.npm \
    /tmp/presenton /var/cache/nginx /var/lib/nginx /var/log/nginx /etc/nginx/conf.d \
    /var/cache/fontconfig && \
    chown -R 1001:0 /app /app_data /tmp/presenton /var/cache/nginx /var/lib/nginx /var/log/nginx /etc/nginx /var/cache/fontconfig && \
    chmod -R g=u /app /app_data /tmp/presenton /var/cache/nginx /var/lib/nginx /var/log/nginx /etc/nginx /var/cache/fontconfig

EXPOSE 8080
USER 1001

CMD ["node", "/app/start.js"]
