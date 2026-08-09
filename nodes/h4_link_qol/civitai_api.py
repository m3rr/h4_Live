# h4_link_qol/civitai_api.py - Backend API Service for Civitai Integration & Civitai Helper Engine
# ==============================================================================
import os
import json
import time
import urllib.request
import urllib.parse
import threading
import ssl
import hashlib
import re
import folder_paths
import asyncio

# --- Active Download Tracking ---
_ACTIVE_DOWNLOADS = {}
_CACHE_LOCK = threading.Lock()

CIVITAI_BASE_URL = "https://civitai.com/api/v1"

# --- Persistent Hash Cache (Assimilated from Civitai Helper) ---
HASH_CACHE_FILE = os.path.join(os.path.dirname(__file__), "civitai_hash_cache.json")
_HASH_CACHE = {}

def _load_hash_cache():
    global _HASH_CACHE
    if os.path.exists(HASH_CACHE_FILE):
        try:
            with open(HASH_CACHE_FILE, "r", encoding="utf-8") as f:
                _HASH_CACHE = json.load(f)
        except Exception:
            _HASH_CACHE = {}

def _save_hash_cache():
    try:
        with open(HASH_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_HASH_CACHE, f, indent=2)
    except Exception:
        pass

_load_hash_cache()

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

def calculate_file_sha256(filepath):
    """
    Assimilated from Civitai Helper:
    Computes full SHA256 and 10-char AutoV2 hash for a local model file with disk-persistent caching.
    """
    if not os.path.exists(filepath):
        return None, None
        
    mtime = os.path.getmtime(filepath)
    cache_key = os.path.abspath(filepath)
    
    if cache_key in _HASH_CACHE:
        entry = _HASH_CACHE[cache_key]
        if isinstance(entry, dict) and entry.get("mtime") == mtime:
            return entry.get("sha256"), entry.get("autov2")
            
    sha256_hash = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                sha256_hash.update(chunk)
        full_sha256 = sha256_hash.hexdigest().upper()
        autov2 = full_sha256[:10]
        
        _HASH_CACHE[cache_key] = {
            "mtime": mtime,
            "sha256": full_sha256,
            "autov2": autov2
        }
        _save_hash_cache()
        return full_sha256, autov2
    except Exception:
        return None, None

def fetch_model_version_by_hash(hash_val, api_key=None):
    """
    Assimilated from Civitai Helper:
    Retrieves exact model version metadata directly from Civitai API using SHA256 / AutoV2 hash.
    """
    if not hash_val:
        return {"success": False, "error": "Missing model hash"}

    url = f"{CIVITAI_BASE_URL}/model-versions/by-hash/{hash_val}"
    if api_key and str(api_key).strip():
        url += f"?token={str(api_key).strip()}"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json"
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with _safe_urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {"success": True, "data": data}
    except Exception as err:
        return {"success": False, "error": str(err)}

def save_civitai_sidecar_and_preview(local_model_path, version_data):
    """
    Assimilated from Civitai Helper:
    1. Saves the Civitai API version JSON response directly into `model_name.civitai.info`.
    2. Downloads the primary preview image from Civitai and saves it as `model_name.png` next to the model file.
    """
    if not local_model_path or not os.path.exists(local_model_path) or not version_data:
        return

    base_no_ext = os.path.splitext(local_model_path)[0]
    civitai_info_file = f"{base_no_ext}.civitai.info"

    # 1. Save .civitai.info sidecar
    try:
        with open(civitai_info_file, "w", encoding="utf-8") as f:
            json.dump(version_data, f, indent=2, ensure_ascii=False)
    except Exception:
        pass

    # 2. Download preview image if missing
    has_preview = any(os.path.exists(f"{base_no_ext}{ext}") for ext in [".preview.png", ".preview.jpg", ".preview.webp", ".png", ".jpg", ".jpeg", ".webp"])
    if not has_preview:
        images = version_data.get("images") or []
        if images and isinstance(images, list) and len(images) > 0:
            first_img = images[0]
            img_url = first_img.get("url") if isinstance(first_img, dict) else str(first_img)
            if img_url:
                target_img_path = f"{base_no_ext}.png"
                try:
                    req = urllib.request.Request(img_url, headers={"User-Agent": "Mozilla/5.0"})
                    with _safe_urlopen(req, timeout=20) as resp, open(target_img_path, "wb") as out_f:
                        out_f.write(resp.read())
                except Exception:
                    pass

def _infer_model_metadata(filename, category=None):
    """
    Intelligently infers base model, model type, and formatted name from filename string.
    """
    clean_name = os.path.basename(filename)
    name_no_ext = os.path.splitext(clean_name)[0]
    
    clean_base = re.sub(r'^[^\w\d\.\-\_]+', '', name_no_ext).strip()
    pretty_name = clean_base.replace("_", " ").replace("-", " ").strip()
    
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
    Assimilates Civitai Helper methods:
    1. Scans local ComfyUI model directories.
    2. Reads local .civitai.info / .json / .txt sidecars if present.
    3. Calculates SHA256/AutoV2 hash & queries Civitai API /by-hash if sidecar is missing.
    4. Automatically writes .civitai.info and downloads preview image (.png) next to local model.
    5. Fallbacks to search & metadata inference if hash lookup returns 404 or network is unavailable.
    """
    if not model_name or not str(model_name).strip():
        return {"success": False, "error": "Empty model name"}

    raw_path = str(model_name).strip().replace("\\", "/")
    clean_name = os.path.basename(raw_path)
    clean_name = re.sub(r'^[^\w\d\.\-\_]+', '', clean_name).strip()
    if not clean_name:
        clean_name = os.path.basename(raw_path)
    name_no_ext = os.path.splitext(clean_name)[0]

    pretty_name, inferred_type, inferred_base = _infer_model_metadata(clean_name)

    local_found = False
    full_model_file_path = None

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
                    full_model_file_path = full_model_path
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

                    # If sidecar provided full metadata, return immediately
                    if local_info["baseModel"] and (local_info["triggerWords"] or local_info["previewUrl"]):
                        if not local_info["description"]:
                            local_info["description"] = f"Local model located in models/{category}/{clean_name}"
                        return {"success": True, "info": local_info}
                    break
            if local_found:
                break
        except Exception:
            continue

    # Civitai Helper Method: Hash Lookup via /by-hash/{hash}
    if full_model_file_path and os.path.exists(full_model_file_path):
        try:
            b_size = os.path.getsize(full_model_file_path)
            mb_size = b_size / (1024 * 1024)
            file_size_str = f"{mb_size / 1024:.2f} GB" if mb_size >= 1000 else f"{mb_size:.1f} MB"
        except Exception:
            file_size_str = "N/A"

        sha256_val, autov2_val = calculate_file_sha256(full_model_file_path)
        lookup_hash = autov2_val or sha256_val
        if lookup_hash:
            hash_res = fetch_model_version_by_hash(lookup_hash, api_key=api_key)
            if hash_res.get("success") and hash_res.get("data"):
                ver_data = hash_res["data"]
                model_obj = ver_data.get("model") or {}
                model_id = ver_data.get("modelId") or model_obj.get("id")
                version_id = ver_data.get("id")
                versions_list = []
                if isinstance(model_obj.get("modelVersions"), list):
                    versions_list = [v.get("name") for v in model_obj["modelVersions"] if isinstance(v, dict) and v.get("name")]
                if not versions_list and ver_data.get("name"):
                    versions_list = [ver_data["name"]]

                images = ver_data.get("images") or []
                img_url = images[0].get("url") if images and isinstance(images[0], dict) else None
                dl_count = model_obj.get("stats", {}).get("downloadCount", 0)
                rating_num = model_obj.get("stats", {}).get("rating", 5.0)

                # Save .civitai.info & download preview image locally (Civitai Helper)
                save_civitai_sidecar_and_preview(full_model_file_path, ver_data)

                # Update previewUrl if image was newly downloaded
                base_no_ext = os.path.splitext(full_model_file_path)[0]
                for ext in [".png", ".jpg", ".preview.png", ".webp"]:
                    if os.path.exists(f"{base_no_ext}{ext}"):
                        local_info["previewUrl"] = f"/h4/link/view?path={urllib.parse.quote(os.path.abspath(f'{base_no_ext}{ext}'))}"
                        break

                return {
                    "success": True,
                    "info": {
                        "modelId": model_id,
                        "modelVersionId": version_id,
                        "name": model_obj.get("name") or local_info["name"],
                        "versionName": ver_data.get("name") or local_info["versionName"],
                        "versionsAvailable": versions_list,
                        "fileSize": file_size_str,
                        "type": str(model_obj.get("type") or local_info["type"]).upper(),
                        "baseModel": ver_data.get("baseModel") or local_info["baseModel"],
                        "rating": f"⭐ {rating_num:.1f}" if rating_num else "⭐ 5.0",
                        "downloadCount": f"{dl_count:,}" if isinstance(dl_count, int) else str(dl_count),
                        "triggerWords": ver_data.get("trainedWords") or local_info["triggerWords"],
                        "previewUrl": local_info["previewUrl"] or img_url,
                        "description": re.sub(r'<[^>]*>?', '', model_obj.get("description") or "") or local_info["description"],
                        "filename": clean_name
                    }
                }

    # Fallback to online Civitai text search with strict token matching
    clean_lower = clean_name.lower()
    clean_no_ext = name_no_ext.lower()
    
    def _tokenize_smart(text):
        text_clean = text.replace('.safetensors', '').replace('.ckpt', '').replace('.pt', '')
        subwords = re.findall(r'[a-zA-Z]+|\d+', text_clean.lower())
        res = []
        for w in subwords:
            if w.startswith('pony') and len(w) > 4:
                res.extend(['pony', w[4:]])
            elif w.endswith('xl') and len(w) > 2:
                res.extend([w[:-2], 'xl'])
            else:
                res.append(w)
        stop = {'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'safetensors', 'ckpt', 'pt', 'sd15', 'pruned', 'emaonly', 'fp16', 'model', 'lora'}
        return [t for t in res if len(t) >= 2 and t not in stop]

    query_tokens = _tokenize_smart(clean_name)
    first_token = query_tokens[0] if query_tokens else name_no_ext.replace("_", " ").replace("-", " ").strip()

    civitai_res = search_civitai(query=first_token, limit=10, api_key=api_key)
    if civitai_res.get("success") and civitai_res.get("items"):
        best_item = None
        best_ver = None

        for item in civitai_res["items"]:
            item_name_lower = item.get("name", "").lower()
            
            # 1. Check exact/substring file name matches in item versions
            for ver in item.get("modelVersions", []):
                for f in ver.get("files", []):
                    f_name_lower = f.get("name", "").lower()
                    if f_name_lower == clean_lower or f_name_lower == clean_no_ext or clean_lower in f_name_lower or f_name_lower in clean_lower:
                        best_item = item
                        best_ver = ver
                        break
                if best_ver: break
            if best_item: break

            # 2. Strict token match: ALL query tokens must be present in item title
            if query_tokens and all(t in item_name_lower for t in query_tokens):
                best_item = item
                best_ver = (item.get("modelVersions") and item["modelVersions"][0]) or {}
                break

        if best_item and best_ver:
            img_url = (best_ver.get("images") and best_ver["images"][0].get("url")) or None
            words_list = best_ver.get("trainedWords") or []
            raw_desc = (best_item.get("description") or "").strip()
            safe_desc = re.sub(r'<[^>]*>?', '', raw_desc)
            creator_uname = (best_item.get("user") or {}).get("username")
            stats = best_item.get('stats', {})
            dl_count = stats.get('downloadCount', 0)
            rating_num = stats.get('rating', 5.0)
            thumbs_up = stats.get('thumbsUpCount') or stats.get('favoriteCount')

            model_id = best_item.get("id")
            versions_list = [v.get("name") for v in best_item.get("modelVersions", []) if v.get("name")]

            files = best_ver.get("files") or []
            f_size_str = "N/A"
            if files and isinstance(files[0], dict) and files[0].get("sizeKB"):
                s_mb = files[0]["sizeKB"] / 1024.0
                f_size_str = f"{s_mb/1024.0:.2f} GB" if s_mb >= 1000 else f"{s_mb:.1f} MB"

            return {
                "success": True,
                "info": {
                    "modelId": model_id,
                    "modelVersionId": best_ver.get("id"),
                    "name": best_item.get("name") or local_info["name"],
                    "creator": creator_uname,
                    "versionName": best_ver.get("name") or local_info["versionName"],
                    "versionsAvailable": versions_list,
                    "fileSize": f_size_str if f_size_str != "N/A" else local_info["fileSize"],
                    "type": best_item.get("type") or local_info["type"],
                    "baseModel": best_ver.get("baseModel") or local_info["baseModel"],
                    "rating": f"⭐ {rating_num:.1f}" if rating_num else "⭐ 5.0",
                    "downloadCount": f"{dl_count:,}" if isinstance(dl_count, int) else str(dl_count),
                    "thumbsUpCount": f"{thumbs_up:,}" if isinstance(thumbs_up, int) else thumbs_up,
                    "triggerWords": words_list or local_info["triggerWords"],
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
    Maps Civitai model type strings to standard ComfyUI directory locations.
    """
    m_type = str(model_type).upper()
    
    if "LORA" in m_type or "LOCON" in m_type:
        folder_key = "loras"
    elif "CHECKPOINT" in m_type or "MODEL" in m_type:
        folder_key = "checkpoints"
    elif "VAE" in m_type:
        folder_key = "vae"
    elif "CONTROL" in m_type:
        folder_key = "controlnet"
    elif "UNET" in m_type:
        folder_key = "unet"
    elif "EMBEDDING" in m_type or "TEXTUAL" in m_type:
        folder_key = "embeddings"
    elif "CLIP" in m_type:
        folder_key = "clip"
    elif "HYPER" in m_type:
        folder_key = "hypernetworks"
    else:
        folder_key = "checkpoints"

    paths = folder_paths.get_folder_paths(folder_key)
    if paths and len(paths) > 0:
        target_dir = paths[0]
    else:
        models_dir = folder_paths.models_dir
        target_dir = os.path.join(models_dir, folder_key)
        os.makedirs(target_dir, exist_ok=True)

    return target_dir, folder_key

def search_civitai(query="", model_type=None, base_model=None, base_models=None, sort="Highest Rated", period="AllTime", page=1, limit=20, nsfw=False, api_key=None, **kwargs):
    """
    Queries Civitai REST API cleanly.
    Note: Civitai API returns HTTP 503 if 'limit' > 10 when searching with 'query'.
    Civitai API also returns HTTP 400 if 'page', 'sort', or 'period' are passed with 'query'.
    """
    q_str = (query or "").strip()

    params = {}
    if q_str:
        params["query"] = q_str
        params["limit"] = min(int(limit), 10)
    else:
        params["limit"] = min(max(int(limit), 1), 100)
        if sort and sort != "All": params["sort"] = sort
        if period and period != "All": params["period"] = period
        if page and int(page) > 1: params["page"] = int(page)

    if model_type and model_type != "All":
        params["types"] = model_type

    bm_val = base_model or base_models
    if bm_val and bm_val != "All":
        params["baseModels"] = bm_val

    if str(nsfw).lower() in ("true", "1", "yes", "on"):
        params["nsfw"] = "true"

    if api_key and api_key.strip():
        params["token"] = api_key.strip()

    url = f"{CIVITAI_BASE_URL}/models?" + urllib.parse.urlencode(params)
    
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json"
    })

    try:
        with _safe_urlopen(req, timeout=12) as response:
            if response.status == 200:
                raw_body = response.read().decode('utf-8')
                data = json.loads(raw_body)
                return {"success": True, "items": data.get("items", []), "metadata": data.get("metadata", {})}
    except Exception as e:
        print(f"[h4_LinkQoL] Civitai Search API Error for query '{q_str}': {e}")
        
    return {"success": False, "items": []}

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
                chunk_size = 1024 * 512
                
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
                    
            # 2. Civitai JSON sidecar (.civitai.info & .json)
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

            with open(f"{base_no_ext}.civitai.info", "w", encoding="utf-8") as cf:
                json.dump(sidecar_payload, cf, indent=2)

            # 3. Preview Image sidecar (.preview.png & .png)
            if save_preview and preview_image_url:
                try:
                    img_req = urllib.request.Request(preview_image_url, headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 h4_Live_ToolKit/11.2.7"
                    })
                    with _safe_urlopen(img_req, timeout=15) as img_resp:
                        preview_data = img_resp.read()
                        with open(f"{base_no_ext}.preview.png", "wb") as pf:
                            pf.write(preview_data)
                        with open(f"{base_no_ext}.png", "wb") as pf2:
                            pf2.write(preview_data)
                except Exception as img_err:
                    print(f"[h4_link_qol] Warning: Failed to save preview image sidecar: {img_err}")

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

def scan_and_sync_local_models(categories=None, api_key=None):
    """
    Assimilated from Civitai Helper:
    Scans local ComfyUI model folders, computes SHA256/AutoV2 hashes for models missing metadata,
    fetches Civitai API info by hash, and saves `.civitai.info` & preview `.png` files automatically.
    """
    cats = categories or ["checkpoints", "loras", "vae", "embeddings", "controlnet", "unet", "clip", "hypernetworks"]
    synced_count = 0
    scanned_count = 0

    for category in cats:
        try:
            paths = folder_paths.get_folder_paths(category)
            if not paths: continue
            for base_dir in paths:
                if not os.path.exists(base_dir): continue
                for root, dirs, files in os.walk(base_dir):
                    for file in files:
                        if not file.lower().endswith((".safetensors", ".ckpt", ".pt", ".bin")):
                            continue
                        scanned_count += 1
                        full_path = os.path.join(root, file)
                        base_no_ext = os.path.splitext(full_path)[0]

                        civitai_info = f"{base_no_ext}.civitai.info"
                        has_preview = any(os.path.exists(f"{base_no_ext}{ext}") for ext in [".preview.png", ".preview.jpg", ".preview.webp", ".png", ".jpg", ".jpeg", ".webp"])

                        if not os.path.exists(civitai_info) or not has_preview:
                            sha, autov2 = calculate_file_sha256(full_path)
                            h_val = autov2 or sha
                            if h_val:
                                res = fetch_model_version_by_hash(h_val, api_key=api_key)
                                if res.get("success") and res.get("data"):
                                    save_civitai_sidecar_and_preview(full_path, res["data"])
                                    synced_count += 1
        except Exception:
            continue

    return {"success": True, "scanned": scanned_count, "synced": synced_count}
