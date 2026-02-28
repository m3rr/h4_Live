# 🛠️ THE ATOMIC OVERHAUL: OPERATION MOTHERSHIP
**Detailed Action Report | v3.0 Deployment**

---

## 🛰️ EXECUTIVE SUMMARY
The **h4_Live** toolkit has been surgically refactored from a monolithic node pack into a **Dynamic Plugin Ecosystem**. The architectural goal was to achieve "Atomic Swappability"—allowing any node or group of nodes to be added, removed, or shared as a standalone folder without compromising system integrity.

---

## 🏗️ THE NEW ARCHITECTURE

### 1. The Core engine (`/core/`)
We extracted the "Vital Organs" of the toolkit into a protected central package.
- **`h4_core.py`**: State management, loop counters, and the RAM buffer.
- **`h4_utils.py`**: Shared utilities and the `AnyType` wildcard system.
- **`h4_server.py`**: The REST API that handles presets, lore, and thumbnails.
- **`h4_session_manager.py`**: Persistence and metadata handling.

### 2. The Plugin Shelf (`/nodes/`)
Every node module was migrated from the root into its own **Atomic Folder**.
- **Structure**: `nodes/[node_name]/nodes.py` + `__init__.py`.
- **Standalone UI**: Every node's JavaScript was migrated from the global `js/` folder into `nodes/[node_name]/web/`.
- **Isolation**: Each folder is now a "Product." You can move `h4_faceforge` to another PC (provided the Mothership is present) and it will function perfectly.

---

## 🔧 THE TECHNICAL "HANDSHAKE"

### 1. Relative Import Rectification
By moving nodes into sub-packages, all existing imports were broken. I performed a **Global Neural Alignment**:
- Updated `from .h4_core` to `from ..core.h4_core`.
- This ensures nodes can find the "Mothership" engine from their new position on the shelf.

### 2. Dynamic Discovery Engine
Rewrote the root `__init__.py` to be a **Recursive Crawler**.
- It no longer hardcodes imports.
- It scans the `/nodes/` directory on boot.
- It builds a **Live Audit Table** in your console showing [ACTIVE] vs [OFFLINE] modules.

### 3. The JS Harvester Protocol
Solved the "Missing UI" problem for hot-swappable nodes.
- **Harvesting**: On boot, the Mothership clears the root `js/` folder (while protecting OS-level files like `BigBrother.js`).
- **Aggregation**: It then copies the `web/` folder from every node on the shelf into the root `js/` folder.
- **Result**: You drag a folder in $\rightarrow$ the UI appears in ComfyUI instantly.

---

## 📂 DIRECTORY MAP (PROD-READY)
```text
comfyui_h4_live/
├── __init__.py           <-- The Discovery Engine (Root)
├── core/                 <-- THE ENGINE (Do not delete)
├── nodes/                <-- THE SHELF (Add/Remove here)
│   ├── h4_traffic/
│   │   ├── nodes.py      <-- Python Logic
│   │   └── web/          <-- JavaScript UI
│   ├── h4_faceforge/
│   └── ... 27 more
└── js/                   <-- THE HUD (Managed by Harvester)
```

---

## 🧪 DEV CORNER: LOGIC NOTES
- **State Integrity**: The `_H4_GLOBAL_STATE` remains a singleton in the `core` package, ensuring all nodes share the same "Loop Memory."
- **Importlib Strategy**: We use `importlib.import_module` with relative package anchoring to ensure sub-modules register correctly with ComfyUI's main thread.
- **Fail-Safe Mechanism**: If a node folder is corrupted or missing its `NODE_CLASS_MAPPINGS`, the Discovery Engine catches the exception, logs it as `[ ERROR ]`, and continues booting the rest of the pack.

---

**STATUS: NUCLEAR STABLE. ATOMIC MOTHERSHIP IS IN ORBIT.**
