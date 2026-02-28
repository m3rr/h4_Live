import os
import time
import json
import shutil
import folder_paths
from collections import defaultdict
from ..core.h4_core import _log

class ComparinatorVault:
    """
    Manages the physical storage of Comparinator history.
    Root: comfyui_h4_live/comparinator/
    Structure: YYYY-MM-DD-[N]/image_id.json
    Policy: FIFO (Max 10 folders), Capacity (Max 100 images/folder)
    """
    ROOT_DIR = os.path.join(os.path.dirname(__file__), "comparinator")
    MAX_FOLDERS = 10
    MAX_IMAGES_PER_FOLDER = 100

    # Cache
    _HISTORY_CACHE = None
    _CACHE_VALID = False

    @classmethod
    def invalidate_cache(cls):
        cls._CACHE_VALID = False
        cls._HISTORY_CACHE = None

    @classmethod
    def get_todays_folder(cls):
        """Finds or creates the active folder for today."""
        today = time.strftime("%Y-%m-%d")
        
        if not os.path.exists(cls.ROOT_DIR):
            os.makedirs(cls.ROOT_DIR)
            
        candidates = []
        for d in os.listdir(cls.ROOT_DIR):
            if d.startswith(today):
                candidates.append(d)
                
        def sort_key(d):
            if d == today: return 0
            try:
                return int(d.split("[")[1].split("]")[0])
            except:
                return 0
                
        candidates.sort(key=sort_key)
        
        if not candidates:
            # Create first one
            path = os.path.join(cls.ROOT_DIR, today)
            os.makedirs(path, exist_ok=True)
            return path
            
        # Check capacity of latest
        latest = candidates[-1]
        latest_path = os.path.join(cls.ROOT_DIR, latest)
        
        count = len([f for f in os.listdir(latest_path) if f.endswith(".json")])
        
        if count >= cls.MAX_IMAGES_PER_FOLDER:
            # Create new overflow folder
            next_idx = 2
            if latest != today:
                try:
                    curr_idx = int(latest.split("[")[1].split("]")[0])
                    next_idx = curr_idx + 1
                except: pass
                
            new_name = f"{today}-[{next_idx}]"
            new_path = os.path.join(cls.ROOT_DIR, new_name)
            os.makedirs(new_path, exist_ok=True)
            return new_path
            
        return latest_path

    @classmethod
    def _copy_to_vault(cls, filename, dest_folder):
        """Copies a file from Temp to the Vault folder."""
        if not filename: return None
        
        temp_dir = folder_paths.get_temp_directory()
        src = os.path.join(temp_dir, filename)
        
        if os.path.exists(src):
            try:
                shutil.copy(src, dest_folder)
                return filename
            except Exception as e:
                _log(f"[Vault] Copy Failed: {e}")
                return None
        return None

    @classmethod
    def save_entry(cls, metadata):
        """Saves a validated JSON entry AND copies images to the vault."""
        # 1. Validation
        if not cls._validate_schema(metadata):
            _log("[Vault] ❌ Validation Failed: corrupt data rejected.")
            return False
            
        # 2. Prune old entries (FIFO)
        cls._enforce_capacity()
        
        # 3. Get Storage Path
        folder_path = cls.get_todays_folder()
        
        if "timestamp" not in metadata:
            metadata["timestamp"] = int(time.time() * 1000)

        # 4. Copy Images
        cls._copy_to_vault(metadata.get("filename_a"), folder_path)
        cls._copy_to_vault(metadata.get("filename_b"), folder_path)
        
        # Store relative folder path for retrieval
        folder_name = os.path.basename(folder_path)
        metadata["vault_folder"] = folder_name

        # 5. Write JSON
        fname = f"{metadata['timestamp']}_{metadata['image_id']}.json"
        fpath = os.path.join(folder_path, fname)
        
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
            
        _log(f"[Vault] 📝 Saved history to {fpath}")
        cls.invalidate_cache()
        return True

    @classmethod
    def _validate_schema(cls, data):
        """
        Enforces Strict Schema.
        Required: image_id, temp_save_name
        """
        required = ["image_id", "temp_save_name"]
        for r in required:
            if r not in data or data[r] is None:
                _log(f"[Vault] Validation Error: Missing {r}")
                return False
        return True

    @classmethod
    def _enforce_capacity(cls):
        """
        [H4 FIFO] strictly limits total vault size to 100 entries.
        Deletes oldest JSONs and their images.
        """
        HISTORY_LIMIT = 100
        
        if not os.path.exists(cls.ROOT_DIR): return

        # Gather all items
        all_items = []
        for root, dirs, files in os.walk(cls.ROOT_DIR):
            for f in files:
                if f.endswith(".json"):
                    full_path = os.path.join(root, f)
                    try:
                        with open(full_path, "r", encoding="utf-8") as jf:
                            data = json.load(jf)
                            ts = data.get("timestamp", 0)
                            all_items.append({
                                "path": full_path,
                                "timestamp": ts,
                                "data": data,
                                "root": root
                            })
                    except:
                        pass
        
        # Sort Newest -> Oldest
        all_items.sort(key=lambda x: x["timestamp"], reverse=True)
        
        if len(all_items) <= HISTORY_LIMIT:
            return

        # Identify items to prune
        to_prune = all_items[HISTORY_LIMIT:]
        _log(f"[Vault] 🧹 Pruning {len(to_prune)} items to maintain limit of {HISTORY_LIMIT}...")

        for item in to_prune:
            # Delete JSON
            try:
                os.remove(item["path"])
            except Exception as e:
                _log(f"[Vault] Error deleting JSON {item['path']}: {e}")
                continue

            # Delete Images (Image A and B)
            # We assume they are in the same folder as the JSON
            # We construct the image paths from the JSON data
            folder = item["root"]
            
            for key in ["filename_a", "filename_b"]:
                fname = item["data"].get(key)
                if fname:
                    # Check if any OTHER history item uses this image? 
                    # (Unlikely in Comparinator unless manually manipulated)
                    # We'll just delete it.
                    img_path = os.path.join(folder, fname)
                    if os.path.exists(img_path):
                        try:
                            os.remove(img_path)
                        except: pass

        # Clean up empty folders
        cls._prune_empty_folders()
        cls.invalidate_cache()

    @classmethod
    def _prune_empty_folders(cls):
        for root, dirs, files in os.walk(cls.ROOT_DIR, topdown=False):
            if root == cls.ROOT_DIR: continue
            try:
                if not os.listdir(root):
                    os.rmdir(root)
            except: pass

    @classmethod
    def get_all_history(cls):
        """Returns flattened list of all history JSONs, sorted new -> old."""
        
        if cls._CACHE_VALID and cls._HISTORY_CACHE is not None:
             # _log("[Vault] Returning Cached History")
             return cls._HISTORY_CACHE

        history = []
        
        # 1. Scan Vault
        if os.path.exists(cls.ROOT_DIR):
             # Walk all folders
            for root, dirs, files in os.walk(cls.ROOT_DIR):
                for f in files:
                    if f.endswith(".json"):
                        try:
                            with open(os.path.join(root, f), "r", encoding="utf-8") as jf:
                                data = json.load(jf)
                                
                                # Add Source Info
                                data["source"] = "vault"
                                
                                # Construct Relative Path for Images
                                folder_name = os.path.basename(root)
                                
                                def make_path(fname):
                                    if not fname: return None
                                    # Web URLs must use forward slashes, even on Windows
                                    return f"{folder_name}/{fname}"
                                    
                                data["relative_path_a"] = make_path(data.get("filename_a"))
                                data["relative_path_b"] = make_path(data.get("filename_b"))
                                
                                # Check if image exists in Vault (REPAIR LOGIC)
                                vault_img_path = os.path.join(root, data["filename_b"])
                                if not os.path.exists(vault_img_path):
                                     # Try to revive from Temp
                                     temp_path = os.path.join(folder_paths.get_temp_directory(), data["filename_b"])
                                     if os.path.exists(temp_path):
                                          try:
                                              shutil.copy(temp_path, vault_img_path)
                                              # And A
                                              if "filename_a" in data:
                                                  src_a = os.path.join(folder_paths.get_temp_directory(), data["filename_a"])
                                                  dst_a = os.path.join(root, data["filename_a"])
                                                  if os.path.exists(src_a): shutil.copy(src_a, dst_a)
                                          except: pass
                                
                                history.append(data)
                        except:
                            pass
        
        # 2. Temp Recovery Logic
        try:
            temp_dir = folder_paths.get_temp_directory()
            temp_files = os.listdir(temp_dir)
            temp_groups = defaultdict(dict)
            
            for f in temp_files:
                if f.startswith("h4_comp_") and f.endswith(".webp"):
                    parts = f.replace(".webp","").split("_")
                    if len(parts) >= 5:
                        type_suffix = parts[-1] 
                        ts = parts[-2]
                        node_id = "_".join(parts[2:-2])
                        key = f"{node_id}_{ts}"
                        
                        if type_suffix == "A": temp_groups[key]["filename_a"] = f
                        elif type_suffix == "B": temp_groups[key]["filename_b"] = f
                            
            existing_filenames = set()
            for h in history:
                if "filename_b" in h: existing_filenames.add(h["filename_b"])
                if "temp_save_name" in h: existing_filenames.add(h["temp_save_name"])
                
            for key, group in temp_groups.items():
                if "filename_b" not in group: continue
                if group["filename_b"] in existing_filenames: continue
                
                parts = key.rsplit("_", 1)
                node_id = parts[0]
                ts = int(parts[1])
                
                item = {
                    "image_id": node_id,
                    "timestamp": ts,
                    "filename_a": group.get("filename_a", group["filename_b"]),
                    "filename_b": group["filename_b"],
                    "temp_save_name": group["filename_b"],
                    "meta": {},
                    "source": "temp_recovery"
                }
                history.append(item)
                
        except Exception as e:
            _log(f"[Vault] Temp Scan Error: {e}")

        history.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
        
        # Update Cache
        cls._HISTORY_CACHE = history
        cls._CACHE_VALID = True
        
        return history
