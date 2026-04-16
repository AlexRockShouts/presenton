# Project Changes

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

### Modified Files

- `Dockerfile`
- `nginx.conf`
- `start.js`
- `servers/fastapi/services/database.py`
- `k8s/deployment.yaml`
- `.github/workflows/docker-build-push.yml`
- `.github/workflows/README.md`
