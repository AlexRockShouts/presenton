FROM python:3.11-slim-bookworm

# Install Node.js and npm
RUN apt-get update && apt-get install -y \
    nginx \
    curl \
    libreoffice \
    fontconfig \
    chromium \
    zstd


# Install Node.js 20 using NodeSource repository
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs


# Create a working directory
WORKDIR /app  

# Set environment variables
ENV APP_DATA_DIRECTORY=/app_data
ENV TEMP_DIRECTORY=/tmp/presenton
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium


# Install ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Install dependencies for FastAPI
RUN pip install alembic aiohttp aiomysql aiosqlite asyncpg fastapi[standard] \
    pathvalidate pdfplumber chromadb sqlmodel \
    anthropic google-genai openai fastmcp dirtyjson
RUN pip install docling --extra-index-url https://download.pytorch.org/whl/cpu

# Install dependencies for Next.js
WORKDIR /app/servers/nextjs
COPY servers/nextjs/package.json servers/nextjs/package-lock.json ./
RUN npm install


# Copy Next.js app
COPY servers/nextjs/ /app/servers/nextjs/

# Build the Next.js app
WORKDIR /app/servers/nextjs
RUN npm run build

WORKDIR /app

# Copy FastAPI
COPY servers/fastapi/ ./servers/fastapi/
COPY start.js LICENSE NOTICE ./

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose the port
EXPOSE 8080

# Setup permissions for rootless execution and OpenShift (Random UID compatibility)
RUN mkdir -p /app_data /tmp/presenton /var/cache/nginx /var/lib/nginx /var/log/nginx /etc/nginx/conf.d && \
    chown -R 1001:0 /app /app_data /tmp/presenton /var/cache/nginx /var/lib/nginx /var/log/nginx /etc/nginx && \
    chmod -R g=u /app /app_data /tmp/presenton /var/cache/nginx /var/lib/nginx /var/log/nginx /etc/nginx

# Set environment variables for Ollama and others to use writable paths
ENV OLLAMA_MODELS=/app_data/.ollama/models
ENV HOME=/app_data

USER 1001

# Start the servers
CMD ["node", "/app/start.js"]