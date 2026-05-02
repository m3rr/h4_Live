# h4 - Multi Image Upload (The Gallery)
So you’ve got a pile of images and you want them in your workflow. Standard ComfyUI makes you add a "Load Image" node for every. single. one. That’s how you end up with a canvas that looks like a bowl of spaghetti.

The **Multi Image Upload** (aka "The Gallery") is our fix for that. It’s one node that can handle up to 10 images at once. 

### Why use it?
- **Zero Clutter**: Instead of 10 nodes, you have one.
- **Dynamic Slots**: It’s smart. If you only upload 3 images, the other 7 slots stay hidden in the UI so they don't take up space. 
- **Batch Friendly**: Perfect for when you want to run the same effect on a group of textures or reference photos.

### How to use it
Just drop the node and click the **"📤 Smart Upload Image(s)"** button. You can pick your files, and they’ll pop into slots 1 through 10. If you need to add more later, just click the button again or use the individual dropdowns.

---

## 🛠️ Dev Corner (Technical Deep Dive)
**Architecture**: `H4_MultiImgUpload`
**Module**: `h4_loaders.nodes`

The Gallery operates as a **Dynamic Batch Manifest**. Unlike standard loaders that hardcode their return signatures, this node utilizes a programmatic `INPUT_TYPES` generator to map `image_1` through `image_10` into the `optional` widget stack.

**Key Technical Specifications:**
- **Execution Logic**: The `load_images` function iterates through the `**kwargs` payload using a deterministic 1-10 range. It passes each filename through the `_load_image` forensic helper.
- **Forensic Tensor Formatting**: Every image is automatically converted to an RGB float32 tensor `[1, H, W, 3]` and its associated alpha channel is extracted as a normalized mask `[1, H, W]`. 
- **Empty Slot Handling**: If a slot is unassigned ("none"), the kernel yields a **64x64 Zero-Tensor** (black square) to prevent downstream graph-level attribute errors or "NoneType" crashes in the sampler.
- **JS Layout Engine**: The frontend uses `cloakWidget` to exile unused dropdowns to the `-9999px` void. It then monitors the `usedCount` state to dynamically reveal or hide output sockets and widgets in real-time, maintaining **Canvas Sovereignty**.

**Tips for Power Users:**
- You can daisy-chain these nodes to create massive "Image Reservoirs" for complex composition workflows.
- The node is fully compatible with the **H4_ContextHub**, allowing you to pipe an entire 10-image gallery through a single "Purple Wire."

---
*Built for the h4_Live Ecosystem. Clean graphs. No compromise.*
