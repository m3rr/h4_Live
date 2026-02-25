import re

docs = """
### Diagnostics, Modifiers, and Visualizers

**H4_PixelPress (SSAA & HDR)**
- **Supersampling Engine:** Operates a true Super Sampling Anti-Aliasing (SSAA) pipeline. It first upscales the latent/image via a tiled neural model inference (`_tiled_upscale`), mitigating VRAM exhaustion via mathematically precise spatial overlap masking.
- **Colorimetric LAB Transforms:** Instead of naive RGB manipulation, it converts tiles into the CIELAB (`LAB`) color space using `ImageCms.profileToProfile`. This allows isolated manipulation of the Luminance channel (`L`), applying non-linear shadow curve (`1/(1+shadow)`) and highlight exponents without distorting chromaticity (`A`/`B`).
- **Lanczos Down-sampling:** Sharpens via `ImageFilter.UnsharpMask`, then compresses the supersampled array back to the original operational matrix using `Image.Resampling.LANCZOS`, resulting in ultra-crisp micro-details.

**H4_Varianator**
- **Sub-Graph Iteration:** Circumvents ComfyUI's acyclic functional paradigm by embedding a captive `nodes.KSampler` instance within its execute function.
- **Latent Riffing:** Iterates `N` times over a cloned input `LATENT`, mutating the base seed (incrementally or purely randomly) and injecting a variable `denoise` strength governed by predefined boundaries (`minimal: 0.3-0.4`, `major: 0.5-0.55`).
- **Memory Safety:** Decodes the final varied latent batch using `nodes.VAEDecode()` internally and stacks the resulting tensor array (`torch.cat`), preventing graph bloat.

**H4_VisualTokenizer**
- **Tokenizer Extraction:** Dynamically traversing the nested abstraction layers of the provided `CLIP` model (probing for `.tokenizer` or `.cond_stage_model.tokenizer`) to isolate the raw `transformers.CLIPTokenizer`.
- **Lexical Mapping:** Uses internal Comfy functions (`comfy.sd1_clip.token_weights`) to preserve prompt weighting (e.g., `(text:1.2)`), then strictly maps `.tokenize()` outputs to `.convert_tokens_to_ids()`.
- **WebSocket Telemetry:** Broadcasts the parsed matrix via `PromptServer.instance.send_sync("h4.visual_tokenizer.update")`, allowing the JS frontend to construct the token-block UI asynchronously.

**H4_LatentSelector**
- **Deterministic Math:** Computes exact `target_area` baselines depending on architecture (`SDXL:` 1,048,576 pixels vs `SD1.5:` 262,144 pixels). Applies square-root derivations to calculate the closest mathematically pure dimensional ratio, finally snapping to hardware-friendly `modulo 16` pixel boundaries before generating the empty `torch.zeros()` tensor.

**H4_NodeTranslator & H4_Discombobulator**
- **Stateless Anchors:** These nodes execute purely as `noop` (No Operation) backend stubs. They return `{"ui": ...}` or `float("NaN")` for `IS_CHANGED`, ensuring they never trigger unwanted graph evaluations. Their primary existence is to act as DOM injection anchors for `h4_node_translator.js` and the glitch engine, which mutate ComfyUI's internal graph representations (`app.graph._nodes`) on the fly.

**H4_NoteInjector**
- **Rasterized Overlays:** Utilizes raw `PIL.ImageDraw` to composite height-constrained color bars onto incoming `[B, H, W, C]` tensors. Attempts to dynamically load system fonts (`arial.ttf`, `Roboto`) before falling back to `ImageFont.load_default()`. Calculates text bounding boxes to guarantee pixel-perfect centering of dual-line (Title/Subtitle) typographical injections.

"""

with open("d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live/README.md", "r", encoding="utf-8") as f:
    readme = f.read()

target_str = "### Frontend extensions (js/)"

if target_str in readme:
    readme = readme.replace(target_str, docs.strip() + "\n\n" + target_str)
    with open("d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live/README.md", "w", encoding="utf-8") as f:
        f.write(readme)
    print("Successfully injected Batch 4 docs.")
else:
    print("Could not find insertion point!")
