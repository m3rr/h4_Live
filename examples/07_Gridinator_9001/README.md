<div align="center">

![Over 9000](../../Over9000.png)

# IT'S OVER 9000?!?!

</div>

---

### **Welcome to the H4 Gridinator 9001.**

Hi friend! 👋 You have just stumbled upon the most powerful, overkill, and frankly ridiculous grid-making node in ComfyUI. 

Most people use ComfyUI like a goldfish—they generate one image, look at it, and then forget what settings they used. Not you. You are here because you want to be a **Scientist**. You want to test things. You want to see *exactly* how "CFG 7.0" compares to "CFG 8.0" across 10 different models simultaneously.

That is what this node does. It takes your single image workflow and multiplies it into a giant "XY Grid" (or even an XYZ cube!) so you can spot the winner instantly.

---

## 🎨 The Casual Guide (For Humans)

Here is every single knob and dial explained in plain English, so you know exactly what to twist.

### **1. The Brain (Model Selection)**
*   **Base Model**: This is your starting point. Pick a checkpoint from the list. It's the main brain that will dream up your images.
*   **Base Model Fuzzy**: Can't find your model in that huge list? No problem. Just type a part of the name here (like "pony" or "juggernaut") and the Gridinator will hunt it down for you automatically.

### **2. The Canvas (Empty Latent)**
*   **Width / Height**: How big do you want each square in your grid to be? 
    *   *Pro Tip:* For SD1.5, stick to `512x512`. For SDXL or Pony, go for `1024x1024`.
*   **Batch Size**: leave this at `1`. We are making a grid of *different* images, not a batch of the same one.

### **3. The Directives (Prompts)**
*   **Positive Prompt**: Describe what you want to see. "An epic photo of a wizard casting a spell..."
*   **Negative Prompt**: Describe what you don't want. "Blurry, bad hands, low quality..."

### **4. The Engine Room (Sampling Settings)**
These are your standard ComfyUI settings, but built-in:
*   **Seed**: The DNA of the image. Keep it the same to test other settings, or change it to get a totally new composition.
*   **Steps**: How long the AI thinks.
    *   *20* is standard.
    *   *50* is high detail.
    *   *100* is usually a waste of time.
*   **CFG (Creativity Scale)**: How strict the AI should be.
    *   *Lower (2-4)*: The AI ignores you and dreams wildly.
    *   *Mid (7-8)*: The Goldilocks zone.
    *   *High (12+)*: The AI follows your prompt so hard it might burn the image.
*   **Sampler / Scheduler**: The math used to draw. `euler` + `normal` is old reliable. `dpmpp_2m` + `karras` is the modern favorite.
*   **Denoise**: How much to change things. `1.0` means creating from nothing (txt2img). Lower values are for img2img (refining).

---

## 📐 The Grid (Making it 9000!)

This is where the magic happens. You can vary settings across three different axes.

### **X-Axis (Left to Right)**
*   **Mode**: What are we changing? (e.g., `CFG`, `Steps`, `Model`...)
*   **Values**: Type the numbers you want to test, separated by commas.
    *   *Example:* `7.0, 8.0, 9.0, 15.0`
*   **Override**: Use this for **Models** or text. If you type here, it overrides the "Values" box. You can right-click this box to easily search for model filenames!

### **Y-Axis (Top to Bottom)**
*   Same as above, but vertical.
*   *Classic Combo:* Set **X** to `CFG` and **Y** to `Steps` to find the perfect balance for a new model.

### **Z-Axis (The Stack)**
*   This creates multiple grids stacked on top of each other!
*   *Use Case:* Set **Z** to `Model`. Now you'll get a massive strip of grids comparing 5 different Checkpoints all at once.

---

## ✨ Special Powers (Stutter & Styles)

### **Stutter Mode (Prompt Magic)**
Sometimes you want to test the *words* themselves.
*   **Off**: Boring. Normal mode.
*   **Permutations {A|B}**: Requires curly braces in your prompt.
    *   *Prompt:* "A photo of a {cat|dog|fish}"
    *   *Result:* It will create 3 images: one cat, one dog, one fish.
*   **Emphasis [Token*N]**: Repeats a word to make it stronger.
    *   *Prompt:* "A [scary*5] ghost"
    *   *Result:* "A scary scary scary scary scary ghost". (Very spooky).

### **Sliding Scale (The Lazy Button)**
Don't want to type `10, 20, 30, 40, 50` manually?
1.  Turn on **Sliding Scale Enable**.
2.  Pick your **Start** (Min) and **End** (Max) values.
3.  Set **Count** (e.g., 5).
4.  The Gridinator will do the math and generate the numbers for you automatically.

### **Styling**
*   **Font Size/Color/Background**: Dress up your grid. Make it look professional (or ugly, I'm not your mom).

---

## 👩‍🔬 Use Case Scenarios

### **Scenario A: The "Model Shootout"**
You just downloaded 5 new models and don't know which is best.
*   **X-Axis**: `Model` (List your 5 checkpoints).
*   **Y-Axis**: `None`.
*   **Result**: A clean horizontal lineup of the exact same seed/prompt across 5 different brains.

### **Scenario B: The "Sweet Spot Hunt"**
You found a cool style, but it looks a bit "fried".
*   **X-Axis**: `CFG` (Values: `3, 5, 7, 9, 12`).
*   **Y-Axis**: `Steps` (Values: `15, 20, 30, 50`).
*   **Result**: A large chess board of images. Scan the grid to find the square that looks best.

### **Scenario C: The "Prompt Scientist"**
Does adding "masterpiece" actually do anything?
*   **Positive Prompt**: "A photo of a car {|, masterpiece|, award winning}"
*   **X-Axis**: `Prompt Stutter` (Mode: Permutations).
*   **Result**:
    1.  Image 1: "A photo of a car"
    2.  Image 2: "A photo of a car, masterpiece"
    3.  Image 3: "A photo of a car, award winning"

---

<br>
<br>

# ⚙️ TECHNICAL SPECIFICATIONS (DEV CORNER)

*> "Alright, cut the chatter. How does the loop implementation actually handle the tensor concatenation for the Z-Axis?"*

Here is the verbose technical breakdown for the backend architecture of `H4_Gridinator.py`.

### **Node Architecture**
The `H4_Gridinator` is a **Monolithic Class Implementation**. Unlike standard ComfyUI workflows that rely on graph execution (graph topology), this node encapsulates the entire KSampling pipeline *internally*.
*   **Why?** To bypass the overhead of graph re-evaluation for iterative tasks. It initializes the model loader and sampler loop inside a Python `for` loop, ensuring atomic execution of the entire grid generation process in a single "run" of the node.

### **Memory Management**
*   **Smart VRAM Caching**: The node utilizes a `current_model` pointer. When iterating through the grid, if the `grid_x_mode` is NOT set to `Model`, the checkpoint remains loaded in VRAM. It only triggers `comfy.sd.load_checkpoint_guess_config` when the grid iterator detects a requested model change.
*   **Tensor Stacking**: Images are generated as ephemeral `PIL.Image` objects to minimize VRAM fragmentation. They are stitched into a single large Canvas using `PIL.ImageDraw` and converted back to a `torch.Tensor` (Batch Size 1) for the final output.

### **Fuzzy Matching Logic**
The `fuzzy_load_checkpoint(name)` method implements a substring search algorithm against the `folder_paths.get_filename_list("checkpoints")` registry.
1.  **Iterative Scan**: It loops through all registered checkpoint filenames.
2.  **Case-Insensitive Match**: `if input_name.lower() in filename.lower(): return path`.
3.  **Fallback**: Raises `ValueError` explicitly if no candidate is found, preventing silent failures.

### **Axis Logic & Parsing**
*   **Input Types**: The node exploits ComfyUI's dynamic widget system (via `h4_gridinator.js`) to swap the `grid_val` input between `COMBO` (Dropdown) and `STRING` (Text) based on the `grid_mode` selection.
*   **Parsing Strategy**: The `parse_values` method handles delimiter separation (commas).
    *   **Floats**: Casts for `CFG`, `Denoise`.
    *   **Ints**: Casts for `Steps`, `Seed`.
    *   **Strings**: Preserved for `Model`, `LoRA`.
*   **Sliding Scale Interpolation**: Uses `numpy.linspace(min, max, count)` to generate equidistant vectors for floating-point ranges, ensuring mathematically perfect gradients for parameter sweeps.

### **Dimensional Synthesis (The Stitcher)**
The `stitch_grid` method is a deterministic layout engine.
*   **Coordinate mapping**: `results[(x, y, z)] = image`.
*   **Z-Axis Handling**: The Z-axis is not a true 3rd dimension in the output tensor; instead, it creates "Super-Rows". Each Z-slice appends a full (X*Y) grid vertically, separated by a padding margin, effectively flattening the 3D data cube into a 2D contact sheet for easy viewing.

### **Dynamic Prompt Compilation (Stutter)**
*   **Regex Engine**: Uses `re.sub` for Emphasis parsing `[token*N]`.
*   **Permutation Logic**: While the frontend provides a "Permutations" option, the backend logic relies on the user providing explicit string variations in the `grid_val` string if using standard axes, OR relying on the `apply_stutter` method for internal string expansion if implicit modes are selected.

### **Return Type**
*   **Output**: `("IMAGE",)` -> A single Float32 Tensor `[1, H, W, 3]`.
*   **Downstream**: Ready for `SaveImage` or preview nodes immediately.

---
<div align="right">

*(b'.')b - h4 - { Be Your Best }*

</div>