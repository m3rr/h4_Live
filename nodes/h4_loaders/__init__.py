from .nodes import H4_UniversalLoader, H4_CompleteLoader, H4_MultiImgUpload

NODE_CLASS_MAPPINGS = {
    "H4_UniversalLoader": H4_UniversalLoader,
    "H4_CompleteLoader": H4_CompleteLoader,
    "H4_MultiImgUpload": H4_MultiImgUpload,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "H4_UniversalLoader": "h4 - Universal Loader (Retired)",
    "H4_CompleteLoader": "h4 - Universal Pipeline Loader",
    "H4_MultiImgUpload": "h4 - Multi Image Upload",
}

# [H4] Standalone Modularity
WEB_DIRECTORY = "./web"
