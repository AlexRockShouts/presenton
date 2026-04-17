# Project Changes

### 2026-04-17 - Improved Debug Logging & Observability

Enhanced the observability of the FastAPI service by implementing a configurable logging system and replacing basic `print` statements with structured logs.

### Key Changes

- **Service-Level Observability**
  - Added detailed logging to `LLMClient` to track provider usage, model selection, and request status.
  - Implemented progress and lifecycle logging in the presentation generation and streaming endpoints.
  - Enhanced asset generation visibility by logging image generation and icon search requests.
  - Replaced legacy `print` statements in `IconFinderService` and `ImageGenerationService` with structured logs.
- **Configurable Log Levels**
  - Introduced the `LOG_LEVEL` environment variable (default: `info`) to control application verbosity.
  - Aligned Uvicorn server logs with the application's configured log level.
- **Structured Application Logging**
  - Configured standard Python `logging` in `api/main.py` with consistent formatting.
  - Replaced all startup-related `print` statements with `logger.info`, `logger.debug`, and `logger.error` calls.
- **Enhanced Startup Traceability**
  - Added detailed logs for database migrations, table creation, and LLM/Image Provider validation.
  - Improved visibility into model discovery and connectivity checks during the application lifespan.

### 2026-04-17 - Kubernetes: Fixed 502 Bad Gateway & Startup Failures

Fixed application startup and connectivity issues in Kubernetes/OpenShift environments caused by missing health endpoints, PVC name mismatches, and incorrect LLM API configurations.

### Key Changes

- **Health & Probes**
  - Added `/api/v1/health` endpoint to the FastAPI application to satisfy Kubernetes readiness and liveness probes.
  - Aligned probe paths in `k8s/deployment.yaml` with the new endpoint.
- **Environment & Persistence**
  - Added fallback logic in `app_lifespan` to ensure the application data directory is correctly initialized even if `APP_DATA_DIRECTORY` is not explicitly set.

### 2026-04-17 - SSL Verification & Proxy Support

Fixed application startup failures in Kubernetes/OpenShift environments caused by SSL certificate verification errors when connecting to LLM providers.

### Key Changes

- **Environment Configuration**
  - Introduced `VERIFY_SSL` environment variable to toggle SSL verification (defaulting to `true`).
  - Supports setting `VERIFY_SSL` to a custom CA bundle path or `false` to bypass verification.
- **LLM & Image Generation Clients**
  - Updated `AsyncOpenAI`, `AsyncAnthropic`, and `aiohttp` clients to respect the `VERIFY_SSL` setting.
  - Centralized client initialization in `llm_client.py` and `image_generation_service.py` using a shared `httpx.AsyncClient`.
  - Applied SSL verification logic to model availability checks during startup.

### 2026-04-17 - ChromaDB: Fixed Pre-downloaded Model Discovery

Fixed a persistent `ConnectTimeout` issue by ensuring ChromaDB correctly finds the pre-downloaded embedding model and avoids redundant network requests.

### Key Changes

- **services/icon_finder_service.py**
  - Removed a hardcoded `DOWNLOAD_PATH` override that was forcing ChromaDB to ignore the pre-downloaded model path.
  - Relocated ChromaDB persistent storage to the writable `APP_DATA_DIRECTORY` to support rootless environments.
- **scripts/patch_chromadb.py**
  - Automatically modifies the installed `chromadb` package to increase HTTP timeouts and set a fixed model download path to `/usr/share/chroma_models`.
- **chromadb/utils/embedding_functions/onnx_mini_lm_l6_v2.py (Patched)**
  - Increased connection timeout to 60s and read timeout to 120s (from default 5s).

### 2026-04-17 - Robust Model Pre-downloading (Fix)

Fixed a bug in the `Dockerfile` where the `download_model.py` script was being executed before it was copied into the image.

### Key Changes

- **Dockerfile**
  - Moved the `COPY scripts/download_model.py ./scripts/` command before the `RUN python3 scripts/download_model.py` command.

### 2026-04-17 - Robust Model Pre-downloading

Improved the reliability of the embedding model pre-downloading process in the Docker image by using a dedicated Python script with retry logic and exponential backoff.

### Key Changes

- **scripts/download_model.py**
  - Created a new script to download the `ONNXMiniLM_L6_V2` model with automatic retries (up to 5 attempts) and exponential backoff.
- **Dockerfile**
  - Updated to use the new `download_model.py` script instead of a single-line command, making the build process more resilient to transient network issues during model fetching.

### 2026-04-17 - Docker Image: Pre-downloaded Embeddings

Pre-downloaded the `ONNXMiniLM_L6_V2` embedding model in the Docker image to improve startup performance and allow for offline execution.

### Key Changes

- **Dockerfile**
  - Added a `RUN` command to pre-download the `ONNXMiniLM_L6_V2` embedding model during the build phase.
  - Positioned the download after dependency installation but before permission setup to ensure the model is cached in the persistent `/app_data` directory.

### 2026-04-17 - Permissions Refinement

Improved Dockerfile permissions to ensure smoother execution of LibreOffice, Chromium, and Ollama in restricted rootless environments.

### Key Changes

- **Dockerfile**
  - Expanded pre-created directories in `/app_data` (`.cache`, `.config`, `.local`, `.ollama`, `.npm`) to ensure they are writable by the rootless user/group.
  - Added `/var/cache/fontconfig` to the list of group-writable directories to support font cache generation by LibreOffice and other tools.
  - Unified permission setup to use a more robust `mkdir -p` and `chmod -R g=u` pattern for all critical system paths.

### 2026-04-16 - Bug Fixes: Startup Script

Fixed a critical initialization error and a race condition in `start.js`.

### Key Changes

- **start.js**
  - Resolved `ReferenceError: Cannot access 'process' before initialization` in `startNginx` by renaming the local variable that shadowed the global `process` object.
  - Updated the process exit race logic to correctly wait for `nginxProcess` initialization, preventing premature container exit with code 0.

### 2026-04-16 - Docker Image Optimization

Reduced the Docker image size and optimized layering for faster builds and smaller deployment footprint.

### Key Changes

- **Dockerfile**
  - Implemented multi-stage build:
    - Added a `next-builder` stage to build the Next.js application and prune development dependencies.
    - Final stage now only contains the necessary runtime files from the build stage.
  - Consolidated `apt-get` commands into a single layer to reduce intermediate image overhead.
  - Added `--no-install-recommends` to `apt-get install` to avoid installing unnecessary packages.
  - Cleaned up `apt` cache (`/var/lib/apt/lists/*`) in the same layer as installation.
  - Added `--no-cache-dir` to `pip install` commands to prevent saving unnecessary Python package caches.
  - Optimized layer ordering to cache heavy dependencies (like system packages and Python libraries) before copying frequently changing application code.

- **.dockerignore**
  - Updated to exclude more unnecessary files like `.idea`, `.vscode`, `__pycache__`, and `.DS_Store`, preventing them from being accidentally included in the Docker build context.

### 2026-04-16 - GitHub Workflow for Docker Hub

Added a GitHub Actions workflow to automate building and pushing the container image to Docker Hub.

### Key Changes

- **.github/workflows/docker-build-push.yml**
  - Created a new workflow that builds the Docker image and pushes it to Docker Hub.
  - Supports automated tagging (latest for main branch, version tags for git tags).
  - Uses Docker Buildx for efficient building and caching.

- **.github/workflows/README.md**
  - Updated documentation to include the new build and push workflow.

## 2026-04-16 - Rootless Distribution & OpenShift Compatibility

Added support for rootless container execution and Red Hat OpenShift, ensuring compatibility with arbitrary UIDs and writable Persistent Volume Claims (PVC).

### Key Changes

- **Dockerfile**
  - Switched to non-root user (`UID 1001`) by default.
  - Configured directory permissions (`/app`, `/app_data`, `/tmp/presenton`, and `nginx` system paths) to be group-writable (`GID 0`). This allows OpenShift's random UID to write to these directories.
  - Redirected `nginx` cache and log directories to writable locations.
  - Updated `EXPOSE` to port `8080`.
  - Set `OLLAMA_MODELS` and `HOME` environment variables to writable paths within `/app_data`.

- **nginx.conf**
  - Changed listening port from `80` to `8080` (non-privileged).
  - Redirected PID and error log files to `/tmp` to avoid root-only path restrictions.
  - Commented out the `user` directive since rootless nginx cannot switch users.

- **start.js**
  - Replaced the `service nginx start` command (which requires sudo/root) with a direct `spawn` of the `nginx` process.
  - Integrated `nginx` into the main Node.js process lifecycle, ensuring it is correctly managed as a child process.
  - Excluded `ollama` from the process exit race to prevent pod failures in restricted environments (e.g., CPU-only nodes or strict OpenShift SCCs).

- **servers/fastapi/services/database.py**
  - Moved the SQLite database file (`container.db`) from `/app/` to the writable `APP_DATA_DIRECTORY` (falling back to `/tmp/presenton` if not set). This ensures data persistence when using PVCs in rootless environments.

- **k8s/deployment.yaml**
  - Created/Updated a Kubernetes deployment manifest optimized for OpenShift.
  - Configured `securityContext` with `runAsNonRoot: true`, `runAsUser: 1001`, `runAsGroup: 0`, and `fsGroup: 0`.
  - Included a `PersistentVolumeClaim` for `/app_data` and a `Route` for OpenShift connectivity.
  - Added environment variables `APP_DATA_DIRECTORY` and `TEMP_DIRECTORY`.

- **servers/fastapi/services/temp_file_service.py**
  - Modified `cleanup_base_dir` to only delete the contents of the temporary directory instead of the directory itself. This prevents `PermissionError` in environments where the container user has write access to the directory but lacks permission to remove the directory itself (common in OpenShift/Kubernetes).

### Modified Files

- `Dockerfile`
- `nginx.conf`
- `start.js`
- `servers/fastapi/services/database.py`
- `servers/fastapi/services/temp_file_service.py`
- `k8s/deployment.yaml`
- `.github/workflows/docker-build-push.yml`
- `.github/workflows/README.md`
