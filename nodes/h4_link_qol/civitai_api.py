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
    Executes a urllib request with SSL cert verification fallback context.
    """
    try:
        ctx = ssl._create_unverified_context()
        return urllib.request.urlopen(req, timeout=timeout, context=ctx)
    except urllib.error.HTTPError:
        raise
    except Exception as err:
        return urllib.request.urlopen(req, timeout=timeout)

def _infer_model_metadata(filename, category=None):
    """
    Intelligently infers base model, model type, and formatted name from filename string.
    """
    clean_name = os.path.basename(filename)
    name_no_ext = os.path.splitext(clean_name)[0]
    
    # Format pretty name (replace underscores with spaces)
    import re
    clean_base = re.sub(r'^[^\w\d\.\-\_]+', '', name_no_ext).strip()
    pretty_name = clean_base.replace("_", " ").replace("-", " ").strip()
    
    # Infer Type
    m_type = "CHECKPOINT"
    if category:
        m_type = category.rstrip("s").upper()
    else:
        fn_lower = filename.lower()
        if "lora" in fn_lower or "locon" in fn_lower or "slider" in fn_lower:
            m_type = "LORA"
        elif "vae" in fn_lower:
            m_type = "VAE"
        elif "control" in fn_lower:
            m_type = "CONTROLNET"
        elif "unet" in fn_lower:
            m_type = "UNET"
        elif "embedding" in fn_lower or "textual" in fn_lower:
            m_type = "EMBEDDING"

    # Infer Base Model
    fn_upper = filename.upper()
    base_model = "SD 1.5"
    if "ILLUSTRIOUS" in fn_upper or "ILLUS" in fn_upper:
        base_model = "Illustrious"
    elif "PONY" in fn_upper:
        base_model = "Pony"
    elif "FLUX" in fn_upper:
        base_model = "Flux.1 D"
    elif "SDXL" in fn_upper or "XL" in fn_upper or "DRAWNXL" in fn_upper:
        base_model = "SDXL 1.0"
    elif "SD3" in fn_upper or "SD3.5" in fn_upper:
        base_model = "SD3.5"
    elif "CASCADE" in fn_upper:
        base_model = "Cascade"
    elif "HUNYUAN" in fn_upper:
        base_model = "Hunyuan"
    elif "SD2" in fn_upper or "SD2.1" in fn_upper:
        base_model = "SD 2.1"

    return pretty_name or name_no_ext, m_type, base_model

def get_model_info_by_name(model_name, api_key=None):
    """
    Looks up model details, version info, base model, trigger words, and preview image for a local model filename or string name.
    1. Scans ComfyUI model directories for local .preview.png, .png, .jpg, .json, .civitai.info, .txt sidecars.
    2. Fallbacks to searching Civitai for exact model details and version metadata if local sidecars are incomplete.
    """
    if not model_name or not str(model_name).strip():
        return {"success": False, "error": "Empty model name"}

    raw_path = str(model_name).strip().replace("\\", "/")
    clean_name = os.path.basename(raw_path)
    import re
    clean_name = re.sub(r'^[^\w\d\.\-\_]+', '', clean_name).strip()
    if not clean_name:
        clean_name = os.path.basename(raw_path)
    name_no_ext = os.path.splitext(clean_name)[0]

    pretty_name, inferred_type, inferred_base = _infer_model_metadata(clean_name)

    local_found = False
    local_info = {
        "name": pretty_name,
        "versionName": "",
        "type": inferred_type,
        "baseModel": inferred_base,
        "rating": "N/A",
        "downloadCount": "N/A",
        "triggerWords": [],
        "previewUrl": None,
        "description": f"Model: {clean_name}",
        "filename": clean_name
    }

    # Search local ComfyUI model directories
    for category in ["checkpoints", "loras", "vae", "embeddings", "controlnet", "unet", "clip", "hypernetworks"]:
        try:
            paths = folder_paths.get_folder_paths(category)
            if not paths:
                continue
            for base_dir in paths:
                full_model_path = os.path.join(base_dir, raw_path)
                if not os.path.exists(full_model_path):
                    if hasattr(folder_paths, "get_full_path"):
                        full_model_path = folder_paths.get_full_path(category, clean_name)
                    if not full_model_path or not os.path.exists(full_model_path):
                        full_model_path = os.path.join(base_dir, clean_name)

                if os.path.exists(full_model_path):
                    local_found = True
                    local_info["type"] = category.rstrip("s").upper()
                    base_no_ext = os.path.splitext(full_model_path)[0]

                    # Look for local preview image sidecar (.preview.png, .png, .jpg, .jpeg, .webp)
                    for ext in [".preview.png", ".preview.jpg", ".preview.webp", ".preview.jpeg", ".png", ".jpg", ".jpeg", ".webp"]:
                        test_img = f"{base_no_ext}{ext}"
                        if os.path.exists(test_img):
                            local_info["previewUrl"] = f"/h4/link/view?path={urllib.parse.quote(os.path.abspath(test_img))}"
                            break

                    # Look for local sidecar metadata (.json, .civitai.info, .txt)
                    json_sidecar = f"{base_no_ext}.json"
                    civitai_sidecar = f"{base_no_ext}.civitai.info"
                    txt_sidecar = f"{base_no_ext}.txt"

                    for s_file in [json_sidecar, civitai_sidecar]:
                        if os.path.exists(s_file):
                            try:
                                with open(s_file, "r", encoding="utf-8") as jf:
                                    jdata = json.load(jf)
                                    if isinstance(jdata, dict):
                                        model_obj = jdata.get("model") if isinstance(jdata.get("model"), dict) else jdata
                                        if jdata.get("model_name") or model_obj.get("name"):
                                            local_info["name"] = jdata.get("model_name") or model_obj.get("name")
                                        if jdata.get("version_name") or jdata.get("name"):
                                            local_info["versionName"] = jdata.get("version_name") or jdata.get("name")
                                        if jdata.get("baseModel") or jdata.get("base_model"):
                                            local_info["baseModel"] = jdata.get("baseModel") or jdata.get("base_model")
                                        if jdata.get("model_type") or model_obj.get("type"):
                                            local_info["type"] = str(jdata.get("model_type") or model_obj.get("type")).upper()
                                        if jdata.get("trigger_words") or jdata.get("trainedWords"):
                                            local_info["triggerWords"] = jdata.get("trigger_words") or jdata.get("trainedWords")
                                        if jdata.get("description"):
                                            local_info["description"] = jdata["description"]
                                        if jdata.get("images") and isinstance(jdata["images"], list) and len(jdata["images"]) > 0:
                                            first_img = jdata["images"][0]
                                            img_u = first_img.get("url") if isinstance(first_img, dict) else str(first_img)
                                            if img_u and not local_info["previewUrl"]:
                                                local_info["previewUrl"] = img_u
                            except Exception:
                                pass

                    if not local_info["triggerWords"] and os.path.exists(txt_sidecar):
                        try:
                            with open(txt_sidecar, "r", encoding="utf-8") as tf:
                                content = tf.read().strip()
                                local_info["triggerWords"] = [w.strip() for w in content.split(",") if w.strip()]
                        except Exception:
                            pass

                    if local_info["baseModel"] and (local_info["triggerWords"] or local_info["previewUrl"]):
                        if not local_info["description"]:
                            local_info["description"] = f"Local model located in models/{category}/{clean_name}"
                        return {"success": True, "info": local_info}
                    break
            if local_found:
                break
        except Exception:
            continue

    # Clean query for online search: replace underscores and dashes with spaces
    search_q = name_no_ext.replace("_", " ").replace("-", " ").strip()
    civitai_res = search_civitai(query=search_q, limit=5, api_key=api_key)
    if civitai_res.get("success") and civitai_res.get("items"):
        best_item = None
        best_ver = None
        clean_lower = clean_name.lower()

        for item in civitai_res["items"]:
            for ver in item.get("modelVersions", []):
                for f in ver.get("files", []):
                    if f.get("name", "").lower() == clean_lower:
                        best_item = item
                        best_ver = ver
                        break
                if best_ver: break
            if best_item: break

        if not best_item:
            best_item = civitai_res["items"][0]
            best_ver = (best_item.get("modelVersions") and best_item["modelVersions"][0]) or {}

        img_url = (best_ver.get("images") and best_ver["images"][0].get("url")) or None
        words = best_ver.get("trainedWords") or []
        raw_desc = (best_item.get("description") or "").strip()
        safe_desc = re.sub(r'<[^>]*>?', '', raw_desc)
        dl_count = best_item.get('stats', {}).get('downloadCount', 0)
        rating_num = best_item.get('stats', {}).get('rating', 5.0)

        return {
            "success": True,
            "info": {
                "name": best_item.get("name") or local_info["name"],
                "versionName": best_ver.get("name") or local_info["versionName"],
                "type": best_item.get("type") or local_info["type"],
                "baseModel": best_ver.get("baseModel") or local_info["baseModel"],
                "rating": f"⭐ {rating_num:.1f}" if rating_num else "⭐ 5.0",
                "downloadCount": f"{dl_count:,}" if isinstance(dl_count, int) else str(dl_count),
                "triggerWords": words or local_info["triggerWords"],
                "previewUrl": local_info["previewUrl"] or img_url,
                "description": safe_desc or local_info["description"],
                "filename": clean_name
            }
        }

    return {
        "success": True,
        "info": local_info
    }


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
        "sort": sort,
    }
    
    if query and query.strip():
        params["query"] = query.strip()
    else:
        params["page"] = max(page, 1)
        
    if model_type and model_type != "All":
        m_upper = str(model_type).strip().upper()
        if "LORA" in m_upper or "LOCON" in m_upper:
            params["types"] = "LORA"
        elif "CHECKPOINT" in m_upper or "MODEL" in m_upper:
            params["types"] = "Checkpoint"
        elif "VAE" in m_upper:
            params["types"] = "VAE"
        elif "CONTROL" in m_upper:
            params["types"] = "Controlnet"
        elif "EMBEDDING" in m_upper or "TEXTUAL" in m_upper:
            params["types"] = "TextualInversion"
        elif "UNET" in m_upper:
            params["types"] = "UNet"
        else:
            params["types"] = model_type

    if base_model and base_model != "All":
        params["baseModels"] = base_model

    if nsfw is not None and nsfw != "All":
        params["nsfw"] = "true" if str(nsfw).lower() in ("true", "1", "yes", "on") else "false"

    if api_key and api_key.strip():
        clean_key = api_key.strip()
        params["token"] = clean_key

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
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode('utf-8')
            err_json = json.loads(err_body)
            msg = err_json.get("error") or err_json.get("message") or str(e)
        except Exception:
            msg = str(e)
        return {"success": False, "error": msg, "items": []}
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


