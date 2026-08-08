# h4_link_qol/nodes.py - H4_LinkQoL Node Definition
# ==============================================================================
import os
import json
import folder_paths
from .civitai_api import resolve_target_folder

class H4_LinkQoL:
    """
    🔗 H4 Link QoL - Civitai Model Bridge & Injector
    "Search, Download, Deploy. Zero friction."
    """
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "active_model_name": ("STRING", {
                    "default": "",
                    "multiline": False,
                    "placeholder": "Select or Download a model via The Drawer",
                    "tooltip": "The filename of the model selected or injected from Civitai."
                }),
                "inject_mode": (["Auto (LoRA/Checkpoint)", "LoRA Loader Only", "Checkpoint Loader Only"], {"default": "Auto (LoRA/Checkpoint)"}),
            },
            "optional": {
                "model_type": (["LoRA", "Checkpoint", "VAE", "ControlNet", "Embeddings", "UNet"], {"default": "LoRA"}),
                "trigger_words": ("STRING", {
                    "default": "",
                    "multiline": True,
                    "placeholder": "Trigger words auto-populated on download...",
                    "tooltip": "Auto-extracted trigger words for the downloaded model."
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID"
            }
        }
        
    RETURN_TYPES = ("STRING", "STRING", "STRING", "STRING", "STRING")
    RETURN_NAMES = ("model_name", "model_path", "trigger_words", "civitai_url", "json_metadata")
    FUNCTION = "process_link"
    CATEGORY = "h4_Live/QoL"
    OUTPUT_NODE = True

    DESCRIPTION = """
    🔗 H4 Link QoL - Civitai Bridge & Model Manager
    
    Slide out 'The Drawer' from the sidebar to browse Civitai, preview thumbnails,
    download weights, and directly inject model filenames into your active nodes!
    """

    def process_link(self, active_model_name, inject_mode, model_type="LoRA", trigger_words="", unique_id=None):
        cleaned_name = active_model_name.strip()
        target_dir, category = resolve_target_folder(model_type)
        full_path = os.path.join(target_dir, cleaned_name) if cleaned_name else ""
        
        final_triggers = trigger_words
        civitai_url = ""
        json_metadata_str = "{}"

        if cleaned_name and os.path.exists(full_path):
            base_no_ext = os.path.splitext(full_path)[0]
            txt_sidecar = f"{base_no_ext}.txt"
            json_sidecar = f"{base_no_ext}.json"

            # Load sidecar trigger words if available and prompt field is empty
            if not final_triggers and os.path.exists(txt_sidecar):
                try:
                    with open(txt_sidecar, "r", encoding="utf-8") as f:
                        final_triggers = f.read().strip()
                except Exception:
                    pass

            # Load sidecar JSON metadata if available
            if os.path.exists(json_sidecar):
                try:
                    with open(json_sidecar, "r", encoding="utf-8") as f:
                        meta_payload = json.load(f)
                        json_metadata_str = json.dumps(meta_payload, indent=2)
                        model_id = meta_payload.get("model_id")
                        if model_id:
                            civitai_url = f"https://civitai.com/models/{model_id}"
                except Exception:
                    pass

        return (cleaned_name, full_path, final_triggers, civitai_url, json_metadata_str)

NODE_CLASS_MAPPINGS = {
    "H4_LinkQoL": H4_LinkQoL
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "H4_LinkQoL": "🔗 h4_Link (Civitai Bridge)"
}

