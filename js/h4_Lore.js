export const LORE = {
    // --- LOGIC & TRAFFIC CONTROL ---
    "H4_TrafficRouter": {
        "title": "H4 Traffic Router // THE NEXUS",
        "description": "The ultimate workflow orchestrator. The Nexus merges 'Start' and 'Loop' flows into a single, high-performance execution stream. It features an intelligent denoise controller that automatically shifts values between your setup phase and your refinement loops, ensuring perfectly crisp results without manual intervention.",
        "usage": "Connect your initial data to the 'Start' socket and your recursive feedback to the 'Loop' socket. The node handles the switching logic based on the run count.",
        "tips": ["Use 'Restart' to clear the counter and return to the Setup phase instantly.", "Pair with H4_SmartSave to auto-sort logs by loop depth."]
    },
    "H4_TrafficCop": {
        "title": "H4 Traffic Cop // THE FORK",
        "description": "A surgical logic gate designed for A/B routing. The Cop monitors the system state and directs traffic to different branches of your workflow depending on whether you are in the first run or a subsequent loop. It features 'Safe Passthrough' to prevent workflow crashes by ensuring a valid signal is always sent to both outputs.",
        "usage": "Place this at a decision point where you need different logic for the initialization phase vs the refinement phase.",
        "tips": ["Enable 'Restart on True' to loop back to the start of the logic sequence."]
    },
    "H4_TrafficMerge": {
        "title": "H4 Traffic Merge // THE ZIPPER",
        "description": "The companion to the Traffic Cop. The Zipper seamlessly stitches two divergent data streams back into a single pipeline. It features a built-in wireless receiver that can capture data from an H4_ImageBuffer to eliminate the 'Cycle Error' common in complex ComfyUI loops.",
        "usage": "Use this to recombine parallel logic paths. Leave the 'Loop' input empty to trigger Wireless Mode and bypass wiring constraints.",
        "tips": ["Always check the 'Denoise' output to feed your sampler the correct value for the current run."]
    },
    "H4_StateMonitor": {
        "title": "H4 State Monitor // THE COUNTER",
        "description": "A high-visibility forensic counter that asks the system: 'What run is this?' It extracts the loop iteration directly from the h4 core memory and displays it on the node. Invaluable for debugging complex logic and ensuring your resets are firing correctly.",
        "usage": "Connect the 'Any_In' socket to your logic gate to ensure the monitor waits for the reset signal before reporting.",
        "tips": ["Use the 'loop_count_number' output to drive math nodes or dynamic file naming."]
    },
    "H4_LoopIncrementer": {
        "title": "H4 Loop Incrementer // THE CLICKER",
        "description": "The manual driver for your loops. It explicitly bumps the iteration counter only when it receives a signal. This allows you to separate the 'Logic' of your router from the 'Action' of your workflow, giving you surgical control over exactly when a loop concludes.",
        "usage": "Connect any output from your main processing chain to the 'Pulse' socket to trigger the increment.",
        "tips": ["Enable 'Wireless Reset' to clear the system state via a remote signal from an H4_WirelessResetButton."]
    },
    "H4_WirelessResetButton": {
        "title": "H4 Wireless Reset Button // RED BUTTON",
        "description": "A sovereign UI control that transmits a reset signal across the entire toolkit without a single wire. When toggled, it broadcasts a 'Request Reset' command to all H4 logic nodes, instantly returning the workspace to Run 0.",
        "usage": "Keep this near your output previews to quickly reset and iterate on a new seed or prompt.",
        "tips": ["The status display will confirm 'RESET SENT' once the command is acknowledged by the logic nodes."]
    },
    "H4_ImageBuffer": {
        "title": "H4 Universal Buffer // ANTI-LAG UNIT",
        "description": "The solution to the ComfyUI 'Cycle Lag'. Standard loops often suffer from a 1-cycle delay where data from Run N only arrives at the input during Run N+2. The Universal Buffer intercepts and holds ANY data type—Images, Latents, or Strings—to provide an immediate feedback bridge for the next run.",
        "usage": "Connect your processed data to 'Image_In' to store it, and use the 'Buffered_Data' output at the start of your loop to retrieve it.",
        "tips": ["Leave 'Image_In' empty to run in 'Read-Only' recursion mode."]
    },
    "H4_ContextHub": {
        "title": "H4 Context Hub // THE BUNDLER",
        "description": "A high-density data package. The Hub collects Models, VAEs, CLIPs, and Images into a single sovereign context line. This eliminates 'Spaghetti Wiring' and ensures that all related assets arrive at their destination in perfect synchronization.",
        "usage": "Plug all your core assets into the left side. Run a single thick wire through your logic gates to the Hub Unpacker.",
        "tips": ["Right-click to rename the Hub for better organization in massive workflows."]
    },
    "H4_ContextUnpack": {
        "title": "H4 Context Unpack // THE BREAKER",
        "description": "The extractor for the Context Hub. It cracks open the sovereign context line and releases the individual assets (Models, Images, etc.) for use in samplers or savers. It features 'Zero Lag' extraction with built-in type validation.",
        "usage": "Connect the Context wire from a Hub or Logic gate to the input. Distribute the assets as needed.",
        "tips": ["Any socket not in the original Hub will simply output 'None' safely."]
    },
    "H4_Oxidine": {
        "title": "H4 Oxidine // THE SENTIENT CONDUIT",
        "description": "The absolute pinnacle of data routing. Oxidine creates an 'Omniproxy'—a single wire that behaves like whatever it is connected to. It dynamically inspects the stack to determine if the next node needs a Model, a VAE, or an Image, and presents the correct face of the data automatically.",
        "usage": "Use this when you want a truly wireless-feeling experience. One wire, infinite types.",
        "tips": ["Connect your most important base assets to Oxidine to ensure they are available anywhere on the graph."]
    },
    "H4_MissionControl": {
        "title": "H4 Mission Control // COMMAND CENTER",
        "description": "The central UI override for the h4 toolkit. From here, you can control global aesthetics, toggle forensic HUDs, and manage wireless synchronization. It enforces 'Viewport Sovereignty'—the idea that the UI should work for you, not against you.",
        "usage": "Keep one Mission Control node on your graph to enable the advanced dashboard features.",
        "tips": ["Toggle 'Sovereign HUD' to see detailed resource forensics on every H4 node."]
    },
    "H4_LinearScheduler": {
        "title": "H4 Linear Scheduler // THE METRONOME",
        "description": "Precision timing for long-form generations. Unlike random schedulers, the Metronome allows you to define a start and end value (like CFG or Denoise) and smoothly interpolate between them over a set number of runs. Perfect for 'Power Spirals' or gradual character aging.",
        "usage": "Set your Start, End, and Step count. The node will output the current interpolated value for each loop iteration.",
        "tips": ["Pair with h4_DocuScribe to graph your results over time."]
    },
    "H4_SeedGenerator": {
        "title": "H4 Seed Generator // ENTROPY ENGINE",
        "description": "The definitive source of randomness. The Entropy Engine features advanced synchronization modes, allowing it to 'Wireless Link' with the Mission Control seed. It ensures that every node on your graph is using the same mathematical starting point for consistency.",
        "usage": "Toggle 'Wireless Sync' to follow the global Mission Control seed, or run it independently for local noise variations.",
        "tips": ["Right-click to copy the current seed to the clipboard for external documentation."]
    },
    "H4_LinkQoL": {
        "title": "H4 Link QoL // THE CIVITAI BRIDGE",
        "description": "The direct browser-free gateway between Civitai and ComfyUI. Search for models, preview example image carousels, copy trained trigger words, download directly into designated model directories, and inject model filenames straight into active canvas loader nodes.\n\n🟢 PLAIN ENGLISH OVERVIEW:\nClick the '🔗 Civitai' button in the top bar to open the search panel. Search for any LoRA, Checkpoint, or VAE. Click a thumbnail to open the Model Specifications drawer with a high-res image carousel, trained trigger word copier, and direct download/injection controls.\n\n⚙️ DEV CORNER TECHNICAL SPECIFICATION:\nAsynchronous REST client querying civitai.com/api/v1/models with query parameter filtering. Direct integration with ComfyUI folder_paths API (loras, checkpoints, vae, controlnet). Non-blocking background chunked streaming downloader (1MB buffers) with real-time byte tracking and automated .txt trigger word and .json metadata sidecar creation. Dual glassmorphic UI drawers (#h4-link-drawer-panel, #h4-link-details-panel) with z-index 100005, dynamic viewport positioning, and LiteGraph node parameter injection.",
        "usage": "Click '🔗 Civitai' in top bar to open search. Click any model thumbnail to slide out details and preview carousel. Click 'Download Model' or 'Load into Node' to inject directly.",
        "tips": ["Civitai API response times and rate limits are governed by Civitai servers.", "Click 'Copy' on trigger words to copy all prompt keywords to clipboard.", "Selecting a LoRA node on canvas before clicking 'Load into Node' populates the widget instantly."]
    },
    "H4_UniversalLoader": {
        "title": "H4 Universal Loader // THE PORTER",
        "description": "A high-speed gateway for all model types. The Porter detects if you are trying to load a Checkpoint, a LoRA, or a VAE and presents the correct selection menu. It features 'Tactile Caching'—remembering your favorite models for near-instant swaps.",
        "usage": "Select your model directory and pick your asset. The node handles the internal ComfyUI mapping automatically.",
        "tips": ["Use the 'Refresh' button to scan for newly downloaded assets without restarting ComfyUI."]
    },
    "H4_CompleteLoader": {
        "title": "H4 Complete Loader // THE MASTER KEY",
        "description": "The ultimate initialization unit. The Master Key combines Checkpoint loading, VAE selection, LoRA stacking, and CLIP encoding into a single, compact footprint. It produces a fully prepared Model and Conditioning set, ready for immediate sampling.",
        "usage": "Configure your stack once and use the 'Model' and 'CLIP' outputs to drive your entire workflow.",
        "tips": ["The 'Stack' view allows you to see the combined weight of all active LoRAs at a glance."]
    },
    "H4_MultiImgUpload": {
        "title": "H4 Multi Image Upload // BATCH INGESTER",
        "description": "The high-volume ingestion engine. Stop uploading images one by one. The Ingester allows you to drop entire folders or selections of images into the UI. It processes them into a Batch Tensor, perfect for training sets, slideshows, or 4-way comparisons.",
        "usage": "Drag images into the drop-zone. Use the 'Batch' output to feed batch-aware nodes like the Comparinator.",
        "tips": ["Toggle 'Auto-Sort' to organize your batch by timestamp or filename."]
    },
    "H4_SmartSave": {
        "title": "H4 Smart Save // THE HISTORIAN",
        "description": "Professional-grade asset management. The Historian saves your results with full forensic DNA—embedding the prompt, the workflow, and the hardware metadata directly into the file. It features a sovereign HUD that shows a history rail of your last 100 generations.",
        "usage": "Place this at the end of your workflow. Every generation will be saved with a unique, searchable timestamp and metadata packet.",
        "tips": ["Switch to 'Stealth Mode' to save images with zero UI clutter, but keep the metadata for future audits."]
    },
    "H4_ModelSave": {
        "title": "H4 Model Save // THE ARCHIVIST",
        "description": "Secure storage for your trained assets. Whether you are merging models or fine-tuning, the Archivist saves the current model weights with custom naming and versioning. It automatically includes the 'Merge Map' so you never forget which models created your favorite variant.",
        "usage": "Connect your model output here. Set your prefix and hit Generate to save a permanent .safetensors file.",
        "tips": ["Enable 'Auto-Versioning' to prevent overwriting previous successful merges."]
    },
    "H4_Mutate": {
        "title": "H4 Mutate // THE CHAMELEON",
        "description": "The dynamic prompt engine. The Chameleon takes a base prompt and 'Mutates' it by injecting random tokens or weights from a predefined library. It's the best way to explore 'Concept Drift' and find unexpected aesthetic sweet spots.",
        "usage": "Input your base prompt and select a mutation strength. The node will produce a slightly shifted variation for every run.",
        "tips": ["Use 'Seed Sync' to keep the mutations consistent across multiple samplers."]
    },
    "H4_PixelPress": {
        "title": "H4 Pixel Press // IMAGE COMPACTOR",
        "description": "Efficient image distribution. The Pixel Press applies lossless compression and metadata stripping to prepare your images for the web. It's the professional choice for sharing results without bloated file sizes while maintaining absolute visual fidelity.",
        "usage": "Connect your final image here before saving. Adjust the 'Quality' slider to find the perfect balance between size and detail.",
        "tips": ["Use 'WebP' mode for the smallest file footprint with modern browser compatibility."]
    },
    "H4_FaceForge": {
        "title": "H4 Face Forge // IDENTITY ENGINE",
        "description": "The ultimate face-care suite. Face Forge combines high-fidelity swapping, surgical restoration, and SAM-based occlusion handling into one node. It ensures that your character's identity remains consistent across any lighting or camera angle.",
        "usage": "Connect a source face and a target image. Use the 'Restore' settings to sharpen the new face and the 'SAM' settings to prevent hair/glasses occlusion.",
        "tips": ["Turn on 'Boost' for extra sharpness during the swap phase."]
    },
    "H4_LoadFaceModel": {
        "title": "H4 Load Face Model // THE ARCHIVIST",
        "description": "Instantly recall identities. This node loads a pre-built Face DNA file (.h4f) from your library. It is significantly faster and more reliable than analyzing a raw image every time, ensuring your characters look identical every single time you use them.",
        "usage": "Select a face model from your dropdown list. Plug the 'FACE_MODEL' output into Face Forge.",
        "tips": ["Build your models using H4_BuildFaceModel to capture the best 'average' of a character."]
    },
    "H4_BuildFaceModel": {
        "title": "H4 Build Face Model // DNA EXTRACTOR",
        "description": "The character creator. The DNA Extractor analyzes multiple images of a person and blends them into a single, noise-free Face Model. This 'average' capture is more robust than a single image, making it harder for lighting or angles to break the identity.",
        "usage": "Connect 3-5 images of the same person. The node will output a unique 'FACE_MODEL' that captures their core features.",
        "tips": ["Use clear, front-facing photos for the best extraction results."]
    },
    "H4_SaveFaceModel": {
        "title": "H4 Save Face Model // IDENTITY VAULT",
        "description": "Secure your creations. The Identity Vault takes a detected face or a built model and saves it to your permanent library for future use. Keep your character 'cast' in one place for instant deployment in any future workflow.",
        "usage": "Plug a 'FACE_MODEL' or an image with a detected face into the input. Name your character and save.",
        "tips": ["Build a folder structure in your face library to organize heroes, villains, and NPCs."]
    },
    "H4_IdentityEngine": {
        "title": "H4 Identity Engine // PERSONALITY MATRIX",
        "description": "The character blender. The Matrix allows you to take two or more face models and 'Cross-Pollinate' them. Want a character that is 60% Hero and 40% Villain? This node calculates the mathematical average of their features to create a brand new, stable identity.",
        "usage": "Connect multiple Face Models. Adjust the 'Mix' sliders to blend the features into a new character.",
        "tips": ["Use this to create family members or successors that share similar facial traits."]
    },
    "H4_FaceDetailer": {
        "title": "H4 Face Detailer // THE SURGEON",
        "description": "High-fidelity facial restoration. The Surgeon focuses exclusively on the face, applying multi-pass sharpening (GFPGAN), noise clean-up (CodeFormer), and skin texture enhancement. It's the final touch needed for professional-grade portraits.",
        "usage": "Connect any image where the face looks blurry or 'fried'. The node will automatically find, sharpen, and re-composite the face.",
        "tips": ["Keep 'CodeFormer Weight' around 0.5 to keep the restoration from looking too 'plastic'."]
    },
    "H4_DualCLIPTextEncode": {
        "title": "H4 Dual CLIP Encode // SEΜΑΝTIC BRIDGE",
        "description": "Multi-prompt management. The Semantic Bridge encodes two prompts simultaneously, allowing you to blend between them using a simple slider. This is perfect for complex concept transitions, like changing a character's outfits or shifting from day to night in a single generation.",
        "usage": "Enter your 'Prompt A' and 'Prompt B'. Use the 'Mix' value to control which prompt dominates the latent space.",
        "tips": ["Animate the 'Mix' value using a scheduler for smooth concept-transformation videos."]
    },
    "H4_Pythonipulator-inator": {
        "title": "H4 Pythonipulator // IMAGE KERNEL",
        "description": "The definitive image manipulation kernel. Written in high-performance Python, this node combines OpenCV, Pillow, and Scikit-Image into one tactile interface. It features dedicated modules for Geometric transforms, Cyberpunk glitches, Stylistic filters, and Edge detection.",
        "usage": "Enable the 'CB' module for glitch effects, 'GEO' for rotations, or 'CLR' for brightness/contrast. All modules are sequential.",
        "tips": ["Enable 'Save to Disk' to instantly archive your transformed images to a dedicated folder."]
    },
    "H4_Gridinator": {
        "title": "H4 Gridinator // THE MATRIX",
        "description": "Advanced visualization for batch testing. The Matrix takes a list of images and organizes them into a clean, searchable grid. It's the professional way to compare results across different seeds, prompts, or weights in a single view.",
        "usage": "Plug in a batch of images. Set your 'Columns' and 'Rows'. The node outputs a single 'Contact Sheet' image.",
        "tips": ["Use 'Auto-Labels' to identify which image corresponds to which setting directly on the grid."]
    },
    "H4_Comparinator": {
        "title": "H4 Comparinator // FORENSIC VIEWER",
        "description": "Dual-channel A/B testing. The Comparinator allows for frame-by-frame comparison between two images. It features a high-performance 'Historian' mode that keeps a running rail of previous attempts, letting you 'Time-Travel' back to earlier versions of a generation.",
        "usage": "Connect 'Image A' (Control) and 'Image B' (Test). Use the side-panel to slide between them and inspect the differences.",
        "tips": ["Press the 'Save VS' button to create a side-by-side comparison image for your notes."]
    },
    "H4_DocuScribe": {
        "title": "H4 DocuScribe // THE LOGBOOK",
        "description": "Automated workflow documentation. Every time you generate, DocuScribe writes a markdown entry containing your prompt, your settings, and your result. It's the easiest way to build a professional 'dev log' of your creative process.",
        "usage": "Keep this connected to your final output. It will update the 'h4_log.md' file in your project folder automatically.",
        "tips": ["Review the log in the ComfyUI side-panel for a quick history of your session."]
    },
    "H4_ModelMerger": {
        "title": "H4 Model Merger // WEAVER",
        "description": "Precision weight blending. The Weaver allows for 'Block-Level' merging of two checkponts. Unlike simple 50/50 merges, you can specify exactly which parts of the neural network to prioritize (e.g. Model A's eyes, Model B's lighting).",
        "usage": "Connect two models. Set your 'Ratio' and 'Merge Mode'. Output a new combined model for immediate testing.",
        "tips": ["Use 'Sum Addition' for adding LoRAs directly into the checkpoint weights permanently."]
    },
    "H4_DoubleSampler": {
        "title": "H4 Double Sampler // TWIN TURBO",
        "description": "Multi-pass refinement. The Twin Turbo runs two sampling passes in one node—usually a 'Base' pass followed by a low-denoise 'Refiner' pass. This produces significantly higher detail with zero extra noise.",
        "usage": "Set your base steps and your refiner steps. The node will handle the latent hand-off internally.",
        "tips": ["Use a different sampler for the second pass (e.g. Euler -> DPM++ 2M) for varied texture profiles."]
    },
    "H4_Varianator": {
        "title": "H4 Varianator // THE DIVERGE",
        "description": "The alternative-path engine. The Varianator takes a latent and creates a batch of 'Near-Neighbors'—versions that are slightly different but share the same core structure. It's the fastest way to explore 'Better than Best' without changing your prompt.",
        "usage": "Plug in a latent. Set your 'Variance' amount. It will produce 4-8 variations for you to pick from.",
        "tips": ["Low variance (0.1) is for subtle details; high variance (0.8) is for wild stylistic shifts."]
    },
    "H4_NoteInjector": {
        "title": "H4 Note Injector // THE LABELLER",
        "description": "Embedded organization. This node allows you to attach invisible text 'Notes' to your context wires. These notes travel with your models and images, and can be read by other H4 nodes for dynamic file naming or conditional logic.",
        "usage": "Enter your note text and connect it to a Context Hub or individual wire.",
        "tips": ["Use this to tag images with specific projects or client names wirelessly."]
    },
    "H4_AxisDriver": {
        "title": "H4 Axis Driver // XY CONTROLLER",
        "description": "Grid-based experimentation. The Driver automates the process of changing a single value (like CFG or Steps) over a range of values. It produces an 'XY Grid' that proves exactly how a setting impacts your image.",
        "usage": "Connect the 'Value' output to the target widget. Set your range (Start, End, Steps).",
        "tips": ["Pair with 'H4 Gridinator' to automatically organize the results into a perfect matrix."]
    },
    "H4_DataStream": {
        "title": "H4 Data Stream // THE TELEMETRY",
        "description": "Live data visualization. The Telemetry node captures the 'Heartbeat' of your workflow, displaying real-time VRAM usage, generation speed, and tensor shapes. It's the dashboard for your GPU's soul.",
        "usage": "Connect to any wire to see the data 'In Transit'. No more guessing if your latent is the wrong size.",
        "tips": ["Check the 'Heatmap' view to see which parts of your workflow are consuming the most VRAM."]
    },
    "H4_ForgeMask": {
        "title": "H4 Forge Mask // SURGICAL MASK",
        "description": "Precision region control. Forge Mask allows you to draw or generate masks using mathematical operations (Invert, Dilate, Erode). It features 'Tactile Edge'—a feathering engine that makes composites look seamless.",
        "usage": "Input an image and use the brush to define a region. Output the mask to drive Inpainting or ControlNet.",
        "tips": ["Use 'Dilate' to slightly grow your mask and ensure no hard edges appear during inpainting."]
    },
    "H4_SmartConsole": {
        "title": "H4 Smart Console // THE X-RAY",
        "description": "Deep data inspection. The X-Ray intercepts data in transit and displays a detailed breakdown of tensor shapes, data types, and values directly on top of the node. No more guessing why your latent is the wrong resolution.",
        "usage": "Plug it into any wire to see the 'X-Ray' of what is moving through that connection.",
        "tips": ["Right-click to copy the data dump to your clipboard for analysis."]
    },
    "H4_SeedSequencer": {
        "title": "H4 Seed Sequencer // CHAOS CONTROLLER",
        "description": "Advanced randomness management. Unlike the standard Seed Generator, the Sequencer allows you to define 'Keys' (specific seed lists) and cycle through them. It ensures that your 'Random' generations are actually predictable and repeatable experiments.",
        "usage": "Define a list of seeds and a movement mode (Linear, Ping-Pong, Random). Perfect for testing a prompt against a broad but controlled set of seeds.",
        "tips": ["Use 'Ping-Pong' mode to iterate back and forth through a sequence of 5 seeds."]
    },
    "H4_Switcheroo": {
        "title": "H4 Switcheroo // UNIVERSAL SWAP",
        "description": "The Swiss Army switch. It is a multi-type selector that can swap between Models, Images, Latents, or VAEs with a single toggle. It features a high-performance terminal interface that logs whenever a swap occurs.",
        "usage": "Use this instead of deleting and re-running wires. Toggle inputs instantly.",
        "tips": ["Pair with h4_DocuScribe to track which 'Switch' state was active for each generation."]
    },
    "H4_Discombobulator": {
        "title": "H4 Discombobulator // THE GLITCH",
        "description": "Tactile UI subversion. The Discombobulator is a stealth node that intercepts standard ComfyUI notifications and translates them into various 'glitch' formats. It supports Leet Speak, Binary, Base64, and Spaced-Out 'Void' text. It's the ultimate aesthetic anchor for an h4-themed workspace.",
        "usage": "Place anywhere on the graph. It works silently in the background to 'h4-ify' your workspace feedback.",
        "tips": ["Set to 'b1n4ry' for a truly cryptic, hacker-style experience."]
    },
    "H4_DebugErrorGenerator": {
        "title": "H4 Error Generator // THE SABOTEUR",
        "description": "Stress-test your stability. This node is designed strictly for testing the toolkit's 'Industrial Hardening'. It intentionally triggers a Python-level crash, allowing you to witness how the H4 Core handles critical failures and recovery protocols. DO NOT USE IN PRODUCTION.",
        "usage": "Enter a custom error message and hit generate. The system will crash and attempt a 'Nuclear Recovery'.",
        "tips": ["Use this in a isolated workflow to verify that your 'SmartSave' recovery logic is working."]
    },
    "H4_NodeTranslator": {
        "title": "H4 Node Translator // THE POLYGLOT",
        "description": "Global accessibility. The Polyglot is the master controller for the H4 Live Translation engine. It can translate the entire ComfyUI interface—node titles, widget labels, and descriptions—into multiple languages on the fly without a restart.",
        "usage": "Select your target language (English, French, Spanish, Mandarin, German) and toggle 'Active'.",
        "tips": ["If a node doesn't translate immediately, right-click the graph and select 'Refresh Translation Maps'."]
    },
    "H4_VisualTokenizer": {
        "title": "H4 Visual Tokenizer // THE MIND'S EYE",
        "description": "Demystify CLIP. The Mind's Eye shows you exactly how the AI 'sees' your text. It visualizes the tokenization process, showing which words are broken into sub-tokens and where emphasis (weights) are being concentrated. Essential for prompt-engineering precision.",
        "usage": "Input your prompt and connect a CLIP model. The node will render a visualization of the processed tokens and their mathematical influence.",
        "tips": ["Monitor the 'Token Count' to ensure you don't exceed the 75-token CLIP buffer, which causes trailing words to be ignored."]
    },
    "H4_LatentSelector": {
        "title": "H4 Latent Selector // PRESET MANAGER",
        "description": "Resolution sovereignty. The Selector provides a library of high-performance resolution presets for SD1.5, SDXL, and Flux. It calculates the optimal pixel area for each architecture and ensures your 'Empty Latents' are always multiple-of-16 compatible to prevent VAE distortion.",
        "usage": "Select your model base (e.g. SDXL) and your aspect ratio (e.g. 16:9). The node outputs a perfectly sized Latent batch.",
        "tips": ["Use 'Custom Dimensions' and snap to the nearest 16 pixels automatically even if you don't use a preset."]
    },
    "H4_DisplayAny": {
        "title": "H4 Display Any // THE INSPECTOR",
        "description": "The ultimate data-visualizer. Any type, any time. The Inspector can display Tensors, Lists, Dicts, or Strings directly on the canvas. It's the most powerful tool for ensuring your data streams are carrying the correct values between nodes.",
        "usage": "Connect ANY output to the input. The node will automatically determine the best way to display the data (Text, Table, or Shape Info).",
        "tips": ["Use the multiline view for reading long prompt strings or data dumps from API nodes."]
    },
    "H4_PixelVisualizer": {
        "title": "H4 Pixel Visualizer // DIFF INSPECTOR",
        "description": "See the invisible. This node performs a mathematical 'Subtraction' between two images and displays the difference. It highlights exactly what changed between two generations, making it invaluable for testing LorAs or Denoise settings.",
        "usage": "Connect two images (e.g. before and after a refiner pass). The node will render a heatmap of the pixels that changed.",
        "tips": ["A pure black image means zero change—your settings might be too low!"]
    },
    // --- CORE INFRASTRUCTURE & HIDDEN LAYERS ---
    "H4_ManifestCache": {
        "title": "H4 Manifest Cache // THE REPOSITORY",
        "description": "High-performance metadata persistence. The Repository acts as a local database for tracking every single generation. It caches the manifest logs from SmartSave nodes, allowing for near-instant retrieval of past prompts and parameters across different sessions. It's the brain behind the Historian's long-term memory.",
        "usage": "Place anywhere on your graph to enable background caching. The data is stored in the user's profile under h4_manifests.db.",
        "tips": ["Pair with the Comparinator to pull older generations from months ago into the active comparison pane."]
    },
    "H4_SovereignProxy": {
        "title": "H4 Sovereign Proxy // THE GHOST WIRE",
        "description": "The ultimate workflow cleaner. The Ghost Wire creates an invisible bridge between two points in your graph. It bypasses the standard wiring logic, allowing for 'Wireless Context' transfers over long distances. It implements the 'No Trace' policy by hiding the connection from the visual canvas unless explicitly hovered.",
        "usage": "Use the 'In' proxy to grab a signal and the 'Out' proxy to drop it anywhere else. Renaming the proxies allows you to manage multiple wireless channels.",
        "tips": ["Hover over a proxy to see a temporary glowing beam connecting it to its twin."]
    }
};
