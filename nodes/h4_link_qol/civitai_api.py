# h4_link_qol/civitai_api.py - Backend API Service for Civitai Integration
# ==============================================================================
import os
import json
import time
import urllib.request
import urllib.parse
import threading
import ssl
import folder_paths
import asyncio

# --- Active Download Tracking ---
_ACTIVE_DOWNLOADS = {}
_CACHE_LOCK = threading.Lock()

CIVITAI_BASE_URL = "https://civitai.com/api/v1"

def _safe_urlopen(req, timeout=15):
    """
    Executes a urllib request with SSL cert verification fallback to unverified context
    if strict CA verification fails (common on Windows/Cloudflare SSL chains).
    """
    try:
        return urllib.request.urlopen(req, timeout=timeout)
    except Exception as err:
        err_str = str(err)
        if "CERTIFICATE_VERIFY_FAILED" in err_str or "SSL" in err_str or "certificate" in err_str.lower():
            try:
                ctx = ssl._create_unverified_context()
                return urllib.request.urlopen(req, timeout=timeout, context=ctx)
            except Exception:
                raise err
        raise err

def get_cache_dir():
    """Returns local thumbnail and metadata cache path."""
    temp_dir = folder_paths.get_temp_directory()
    cache_path = os.path.abspath(os.path.join(temp_dir, "h4_civitai_cache"))
    os.makedirs(cache_path, exist_ok=True)
    os.makedirs(os.path.join(cache_path, "thumbnails"), exist_ok=True)
    return cache_path

def resolve_target_folder(model_type, base_model=None):
    """
    Determines target folder paths (LoRA, Checkpoint, VAE, Embeddings, ControlNet, UNet, etc.) using ComfyUI's folder_paths.
    """
    type_lower = str(model_type).lower()
    
    if "lora" in type_lower or "locon" in type_lower:
        category = "loras"
    elif "checkpoint" in type_lower or "model" in type_lower:
        category = "checkpoints"
    elif "vae" in type_lower:
        category = "vae"
    elif "controlnet" in type_lower:
        category = "controlnet"
    elif "textualinversion" in type_lower or "embedding" in type_lower:
        category = "embeddings"
    elif "hypernetwork" in type_lower:
        category = "hypernetworks"
    elif "upscale" in type_lower or "esrgan" in type_lower:
        category = "upscale_models"
    elif "unet" in type_lower or "diffusion" in type_lower:
        category = "unet"
    elif "clip" in type_lower or "text_encoder" in type_lower:
        category = "clip"
    else:
        category = "loras"
        
    paths = folder_paths.get_folder_paths(category)
    if paths and len(paths) > 0:
        target_dir = paths[0]
    else:
        target_dir = os.path.join(folder_paths.models_dir, category)
        
    os.makedirs(target_dir, exist_ok=True)
    return target_dir, category

def search_civitai(query="", model_type="All", base_model="All", sort="Highest Rated", limit=20, page=1, nsfw=None, api_key=None):
    """
    Queries Civitai API for models with filtering, sorting, NSFW controls, and pagination.
    """
    params = {
        "limit": min(limit, 50),
        "page": max(page, 1),
        "sort": sort,
    }
    
    if query and query.strip():
        params["query"] = query.strip()
        
    if model_type and model_type != "All":
        params["types"] = model_type
        
    if base_model and base_model != "All":
        params["baseModel"] = base_model

    if nsfw is not None and nsfw != "All":
        params["nsfw"] = "true" if str(nsfw).lower() in ("true", "1", "yes", "on") else "false"

    url = f"{CIVITAI_BASE_URL}/models?" + urllib.parse.urlencode(params)
    
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 h4_Live_ToolKit/11.2.7",
        "Accept": "application/json"
    })
    
    if api_key and api_key.strip():
        req.add_header("Authorization", f"Bearer {api_key.strip()}")

    try:
        with _safe_urlopen(req, timeout=15) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                return {"success": True, "items": data.get("items", []), "metadata": data.get("metadata", {})}
            else:
                return {"success": False, "error": f"HTTP {response.status}", "items": []}
    except Exception as e:
        return {"success": False, "error": str(e), "items": []}

def fetch_model_details(model_id, api_key=None):
    """
    Retrieves full details and versions for a specific model ID.
    """
    url = f"{CIVITAI_BASE_URL}/models/{model_id}"
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 h4_Live_ToolKit/11.2.7",
        "Accept": "application/json"
    })
    if api_key and api_key.strip():
        req.add_header("Authorization", f"Bearer {api_key.strip()}")
        
    try:
        with _safe_urlopen(req, timeout=12) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                return {"success": True, "model": data}
    except Exception as e:
        return {"success": False, "error": str(e)}
    return {"success": False, "error": "Unknown error"}

def start_model_download(download_url, filename, model_type, model_name="", version_name="", trigger_words=None, preview_image_url=None, save_preview=True, api_key=None):
    """
    Launches an asynchronous background thread to stream model weights and sidecars to disk with progress tracking.
    """
    download_id = f"{filename}_{int(time.time())}"
    target_dir, category = resolve_target_folder(model_type)
    target_path = os.path.join(target_dir, filename)
    
    with _CACHE_LOCK:
        _ACTIVE_DOWNLOADS[download_id] = {
            "id": download_id,
            "filename": filename,
            "model_name": model_name or filename,
            "category": category,
            "target_path": target_path,
            "bytes_downloaded": 0,
            "total_bytes": 0,
            "progress_percent": 0.0,
            "status": "DOWNLOADING",
            "cancelled": False,
            "error": None,
            "start_time": time.time()
        }
        
    def _worker():
        try:
            req = urllib.request.Request(download_url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 h4_Live_ToolKit/11.2.7"
            })
            if api_key and api_key.strip():
                req.add_header("Authorization", f"Bearer {api_key.strip()}")

            with _safe_urlopen(req, timeout=30) as resp:
                total_len = int(resp.headers.get("Content-Length", 0))
                with _CACHE_LOCK:
                    _ACTIVE_DOWNLOADS[download_id]["total_bytes"] = total_len
                    
                downloaded = 0
                chunk_size = 1024 * 512 # 512 KB chunks
                
                with open(target_path, "wb") as f:
                    while True:
                        with _CACHE_LOCK:
                            if _ACTIVE_DOWNLOADS[download_id].get("cancelled"):
                                break

                        chunk = resp.read(chunk_size)
                        if not chunk:
                            break
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        pct = (downloaded / total_len * 100.0) if total_len > 0 else 0.0
                        with _CACHE_LOCK:
                            _ACTIVE_DOWNLOADS[download_id]["bytes_downloaded"] = downloaded
                            _ACTIVE_DOWNLOADS[download_id]["progress_percent"] = round(pct, 1)

            # Check if cancelled mid-download
            with _CACHE_LOCK:
                if _ACTIVE_DOWNLOADS[download_id].get("cancelled"):
                    _ACTIVE_DOWNLOADS[download_id]["status"] = "CANCELLED"
                    if os.path.exists(target_path):
                        try:
                            os.remove(target_path)
                        except Exception:
                            pass
                    return

            base_no_ext = os.path.splitext(target_path)[0]
            
            # 1. Trigger words sidecar (.txt)
            if trigger_words:
                words_str = ", ".join(trigger_words) if isinstance(trigger_words, list) else str(trigger_words)
                with open(f"{base_no_ext}.txt", "w", encoding="utf-8") as tf:
                    tf.write(words_str)
                    
            # 2. Complete JSON sidecar (.json)
            sidecar_payload = {
                "model_name": model_name,
                "version_name": version_name,
                "filename": filename,
                "model_type": model_type,
                "trigger_words": trigger_words or [],
                "downloaded_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            with open(f"{base_no_ext}.json", "w", encoding="utf-8") as jf:
                json.dump(sidecar_payload, jf, indent=2)

            # 3. Preview Image sidecar (.preview.png or .png)
            if save_preview and preview_image_url:
                try:
                    img_req = urllib.request.Request(preview_image_url, headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 h4_Live_ToolKit/11.2.7"
                    })
                    with _safe_urlopen(img_req, timeout=15) as img_resp:
                        preview_path = f"{base_no_ext}.preview.png"
                        with open(preview_path, "wb") as pf:
                            pf.write(img_resp.read())
                except Exception as img_err:
                    print(f"[h4_link_qol] Warning: Failed to save preview image sidecar: {img_err}")

            # Notify folder_paths of directory updates if supported
            try:
                if hasattr(folder_paths, 'filename_list_cache'):
                    folder_paths.filename_list_cache.clear()
            except Exception:
                pass

            with _CACHE_LOCK:
                _ACTIVE_DOWNLOADS[download_id]["status"] = "COMPLETE"
                _ACTIVE_DOWNLOADS[download_id]["progress_percent"] = 100.0
                
        except Exception as e:
            with _CACHE_LOCK:
                _ACTIVE_DOWNLOADS[download_id]["status"] = "FAILED"
                _ACTIVE_DOWNLOADS[download_id]["error"] = str(e)

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()
    return download_id

def cancel_download(download_id):
    """
    Cancels an active model download by task ID.
    """
    with _CACHE_LOCK:
        if download_id in _ACTIVE_DOWNLOADS:
            _ACTIVE_DOWNLOADS[download_id]["cancelled"] = True
            _ACTIVE_DOWNLOADS[download_id]["status"] = "CANCELLING"
            return {"success": True, "download_id": download_id}
        return {"success": False, "error": "Task not found"}

def get_download_status(download_id=None):
    """
    Returns current download progress for a specific task or all active tasks.
    """
    with _CACHE_LOCK:
        if download_id:
            return _ACTIVE_DOWNLOADS.get(download_id, {"status": "NOT_FOUND"})
        return list(_ACTIVE_DOWNLOADS.values())


