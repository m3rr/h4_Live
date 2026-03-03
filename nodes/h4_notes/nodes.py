import torch
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageColor
import os
import folder_paths

class H4_NoteInjector:
    """
    Injects a stylish note/title bar onto an image.
    """
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "title_text": ("STRING", {"multiline": False, "default": "My Title"}),
                "bar_height": ("INT", {"default": 100, "min": 0, "max": 1000}),
                "position": (["top", "bottom"],),
                "font_size_title": ("INT", {"default": 60, "min": 10, "max": 500}),
                "font_size_sub": ("INT", {"default": 30, "min": 10, "max": 500}),
                "text_color": ("STRING", {"default": "#FFFFFF"}),
                "bar_color": ("STRING", {"default": "#000000"}),
            },
            "optional": {
                "subtitle_text": ("STRING", {"multiline": True, "default": ""}),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image",)
    FUNCTION = "execute"
    CATEGORY = "h4_Live/Visuals"

    def execute(self, image, title_text, bar_height, position, font_size_title, font_size_sub, text_color, bar_color, subtitle_text=""):
        # Convert Tensor to PIL
        # Handle batch? Just process one for now or loop
        # image is [B, H, W, C]
        
        batch_size = image.shape[0]
        out_images = []

        # Load Font
        def get_font(size):
            try:
                # Try loading a standard font
                font_paths = [
                    "arial.ttf", "Arial.ttf", 
                    "Roboto-Regular.ttf", "DejaVuSans.ttf",
                    "C:\\Windows\\Fonts\\arial.ttf"
                ]
                for p in font_paths:
                    try:
                        return ImageFont.truetype(p, size)
                    except:
                        pass
                return ImageFont.load_default()
            except:
                 return ImageFont.load_default()

        font_title = get_font(font_size_title)
        font_sub = get_font(font_size_sub)

        for i in range(batch_size):
            img_tensor = image[i]
            # [H, W, C] -> PIL
            img_np = (img_tensor.cpu().numpy() * 255).astype(np.uint8)
            pil_img = Image.fromarray(img_np)
            
            width, height = pil_img.size
            
            # Create Bar
            bar = Image.new("RGB", (width, bar_height), color=bar_color)
            draw = ImageDraw.Draw(bar)
            
            # Draw Text
            # We want to center the text? Or left align?
            # Let's center it for "Title" look.
            
            # Title
            # Use textbbox for size
            bbox = draw.textbbox((0, 0), title_text, font=font_title)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]
            
            # Position Title
            # If subtitle exists, move title up
            center_x = width // 2
            center_y = bar_height // 2
            
            if subtitle_text:
                 # Title above center
                 title_y = center_y - text_h - 5 # padding
                 draw.text((center_x - text_w // 2, title_y), title_text, font=font_title, fill=text_color)
                 
                 # Subtitle below center
                 bbox_sub = draw.textbbox((0, 0), subtitle_text, font=font_sub)
                 sub_w = bbox_sub[2] - bbox_sub[0]
                 sub_y = center_y + 5
                 draw.text((center_x - sub_w // 2, sub_y), subtitle_text, font=font_sub, fill=text_color)
            else:
                 # Center Title
                 draw.text((center_x - text_w // 2, center_y - text_h // 2), title_text, font=font_title, fill=text_color)
            
            # Composite
            new_height = height + bar_height
            new_img = Image.new("RGB", (width, new_height), color=bar_color)
            
            if position == "top":
                new_img.paste(bar, (0, 0))
                new_img.paste(pil_img, (0, bar_height))
            else:
                new_img.paste(pil_img, (0, 0))
                new_img.paste(bar, (0, height))
                
            # Convert back to tensor
            out_np = np.array(new_img).astype(np.float32) / 255.0
            out_images.append(torch.from_numpy(out_np))
            
        result = torch.stack(out_images)
        return (result,)