import re

docs = """
**H4_TrafficCop**
- **Architecture Note:** Operates as a legacy splitter, strictly forwarding the `any_input` reference to both output ports simultaneously without explicit dropping, prioritizing acyclic safety over conditional occlusion.
- **Fail-Safe Mechanism:** Injects dummy references into inactive pathways to prevent `NoneType` propagation crashes in downstream ComfyUI execution flows.
- **State Resolution:** Polls `_H4_GLOBAL_STATE` `loop_count` to determine routing without mutating the state counter itself.

**H4_StateMonitor**
- **Instrumentation:** Acts as a transparent telemetry intercept. It reads the `loop_count` directly from Python's global namespace memory (`h4_core.get_state()`).
- **Graph Synchronization:** Implements an `Any_In` pass-through port to force ComfyUI's DAG executor to delay the `report_state` execution until deterministic prerequisite nodes resolve, bypassing race conditions.

**H4_LoopIncrementer**
- **Mutation Vector:** Exclusively handles the `+1` incrementation array logic decoupled from parameter routing, adhering to single-responsibility architecture.
- **Interrupt Listener:** Constantly evaluates the `request_reset` boolean flag within the global `orbit_get()` dictionary cache. If triggered, `reset_state()` forces the loop count integer back to `0` preemptively before pass-through.

**H4_WirelessResetButton**
- **Non-Linear State Injection:** Bypasses conventional DAG topography by writing a `True` flag directly into the `orbit_get` persistence layer (`request_reset`).
- **Orphan Node Execution:** Required to be evaluated. It has `OUTPUT_NODE = True`, forcing ComfyUI to execute its `send_reset()` function even without terminal outputs, enabling out-of-band state mutation.

**H4_ImageBuffer**
- **Storage Subroutine:** Invokes `buffer_image()` to establish a global heap reference for arbitrary Python objects (`ANY_TYPE`). By persisting memory addresses instead of serializing payloads, zero-copy overhead is maintained.
- **Cycle Evasion Strategy:** Circumvents cyclical graph dependency faults by segregating writes (Run N) from reads (Run N+1) through decoupled temporal execution windows. Fallback mechanisms utilize previous states if upstream dependencies fail.
"""

with open("d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live/README.md", "r", encoding="utf-8") as f:
    readme = f.read()

# I will inject these lines into the 'Router and Merge control flow' section, right after H4_TrafficMerge.
target_str = "- Performs runtime type checks to prevent Image/Latent mismatches."

if target_str in readme:
    readme = readme.replace(target_str, target_str + "\n\n" + docs.strip())
    with open("d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live/README.md", "w", encoding="utf-8") as f:
        f.write(readme)
    print("Successfully injected Batch 1 docs.")
else:
    print("Could not find insertion point!")
