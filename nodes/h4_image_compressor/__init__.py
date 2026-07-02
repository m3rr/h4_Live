# __init__.py
from .nodes import H4_ImageCompressor

# Use only string keys so the server can JSON-serialize mappings cleanly.
NODE_CLASS_MAPPINGS = {
    "H4_ImageCompressor": H4_ImageCompressor,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "H4_ImageCompressor": "h4 // Image Compressor",
}
