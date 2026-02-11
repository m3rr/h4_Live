import torch
import torch.nn.functional as F

class H4_PixelVisualizer:
    """
    Visualizes pixel-level differences between two images (A and B).
    Outputs:
    - Heatmap: Amplified |A - B|
    - Side-by-Side: A | B
    - Original (A)
    - Processed (B)
    """
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image_a": ("IMAGE",),
                "image_b": ("IMAGE",),
                "heatmap_scale": ("FLOAT", {"default": 5.0, "min": 0.0, "max": 100.0, "step": 0.5}),
            }
        }

    RETURN_TYPES = ("IMAGE", "IMAGE", "IMAGE", "IMAGE")
    RETURN_NAMES = ("heatmap", "side_by_side", "image_a", "image_b")
    FUNCTION = "visualize"
    CATEGORY = "h4_Live/Image"

    def visualize(self, image_a, image_b, heatmap_scale):
        # 1. Handle Batch Dimensions
        # We process batch by batch, but Comfy image batches are usually [B, H, W, C]
        
        # Check matching batch size or broadcast
        # If A is batch 1 and B is batch 4, we repeat A? 
        # For simplicity, let's assume 1:1 or broadcast if B is larger.
        
        # 2. Handle Resolution Mismatch
        # If B is different size, resize B to match A
        if image_a.shape[1:3] != image_b.shape[1:3]:
            # Permute to [B, C, H, W] for interpolation
            b_permuted = image_b.permute(0, 3, 1, 2)
            target_h, target_w = image_a.shape[1], image_a.shape[2]
            
            # Resize
            b_resized = F.interpolate(b_permuted, size=(target_h, target_w), mode="bilinear", align_corners=False)
            
            # Permute back to [B, H, W, C]
            image_b_aligned = b_resized.permute(0, 2, 3, 1)
        else:
            image_b_aligned = image_b

        # 3. Calculate Diff (Heatmap)
        # Absolute difference
        diff = torch.abs(image_a - image_b_aligned)
        
        # Amplify
        heatmap = diff * heatmap_scale
        
        # Clamp to 0-1
        heatmap = torch.clamp(heatmap, 0.0, 1.0)
        
        # 4. Side-by-Side Composite [A | B]
        # Concatenate along Width (dimension 2)
        # image_a is [B, H, W, C]
        side_by_side = torch.cat((image_a, image_b_aligned), dim=2)
        
        # 5. Return
        return (heatmap, side_by_side, image_a, image_b)
