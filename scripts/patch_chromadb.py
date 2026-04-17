import os
import re
import chromadb.utils.embedding_functions.onnx_mini_lm_l6_v2 as m

file_path = m.__file__
print(f"Patching {file_path}...")

with open(file_path, "r") as f:
    content = f.read()

# 1. Increase timeouts
timeout_pattern = r'with httpx\.stream\("GET", url\) as resp:'
timeout_replacement = 'timeout = httpx.Timeout(90.0, connect=90.0, read=90.0, write=90.0, pool=90.0)\n        with httpx.stream("GET", url, timeout=timeout) as resp:'

if timeout_pattern in content:
    content = content.replace('with httpx.stream("GET", url) as resp:', timeout_replacement)
    print("Timeout fix applied.")
elif 'httpx.Timeout' in content:
    print("Timeout fix already present.")
else:
    print("Timeout pattern not found!")

# 2. Change DOWNLOAD_PATH to /usr/share/chroma_models
# Using a fixed path in the image that is NOT shadowed by volumes
path_pattern = 'DOWNLOAD_PATH = Path.home() / ".cache" / "chroma" / "onnx_models" / MODEL_NAME'
path_replacement = 'DOWNLOAD_PATH = Path("/usr/share/chroma_models") / MODEL_NAME'

if path_pattern in content:
    content = content.replace(path_pattern, path_replacement)
    print("DOWNLOAD_PATH updated to /usr/share/chroma_models.")
elif '/usr/share/chroma_models' in content:
    print("DOWNLOAD_PATH already updated.")
else:
    print("DOWNLOAD_PATH pattern not found!")

with open(file_path, "w") as f:
    f.write(content)

print("Patching complete.")
