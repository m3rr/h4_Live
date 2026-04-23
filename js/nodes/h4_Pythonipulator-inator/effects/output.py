import os
from PIL import Image
import datetime

def save_image(img, filename_prefix, output_dir):
    """
    Saves the processed PIL image to the specified directory.
    Uses a timestamped suffix to prevent filename collisions during high-speed workflows.
    """
    # Ensure directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
    
    # Generate timestamped filename
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"{filename_prefix}_{timestamp}.png"
    filepath = os.path.join(output_dir, filename)
    
    # Commit image to disk
    try:
        img.save(filepath, format="PNG")
        print(f"[H4 Pythonipulator] Image saved to: {filepath}")
    except Exception as e:
        print(f"[H4 Pythonipulator] ERROR: Failed to save image: {str(e)}")
