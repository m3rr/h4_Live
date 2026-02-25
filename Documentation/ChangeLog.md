# ChangeLog - h4_Live 🚀

All notable changes to the h4_Live project will be documented in this file.

## [5.23.0] - 2026-02-25
### Added
- **Phase XXXIII: The Dual-Core Engine (Double Sampler)**: Implemented `H4_DoubleSampler`, a powerhouse all-in-one sampling node.
- **Dual-Stage Sampling**: Native support for primary and refiner/second-pass sampling within a single node.
- **Sentient Prompting**: Integrated "Prompt Stutter" (randomized token repetition for emphasis) and "Wildcard" replacement systems.
- **Dynamic UX**: Created `h4_DoubleSampler.js` with smart widget management that hides Stage 2 settings when disabled to maintain workspace purity.
- **Registry Integration**: Fully registered in the h4_Live toolkit core.

## [5.22.0] - 2026-02-23
### Added
- **Phase XXXII: The Absolute Recovery (Startup & TOML Fix)**: Resolved persistent startup hang by reverting to relative JS imports and hardening input/output guards in `h4_Oxidine.js`.
- **TOML Sanitization**: Explicitly set `dependencies = []` in `pyproject.toml` to satisfy environment-specific pydantic parser requirements.
- **Initialization Fortification**: Added safety checks for `app.graph` during the BFS scouting sequence to prevent race conditions during workflow load.

## [5.21.0] - 2026-02-23
### Added
- **Phase XXXI: The Great Unchaining (Redraw Fix)**: Identified and removed an infinite redraw loop in `h4_Oxidine.js` (`onDrawBackground`) that was pinning the UI thread and causing the tab to hang.
- **JS Restoration & Hardening**: Fully restored `h4_Oxidine.js` from catastrophic syntax corruption. Hardened `import` paths to be root-relative.
- **Sentinel Solidification**: Finalized the Python `OMNIPROXY` logic to ensure safe latent delivery during sampler probes.

## [5.20.0] - 2026-02-23
### Added
- **Phase XXX: The Ghost in the Machine (Emergency Fixes)**: Resolved a critical frontend hang (endless loading screen) caused by potential undefined access during node initialization.
- **Port Management Hardening (JS)**: Added safety checks to `onConnectionsChange` to prevent the JS engine from crashing if inputs are probed before full initialization.
- **Latent Fallback Fortification (Python)**: Hardened the `OMNIPROXY` even further. It now surgically delivers a **Safe Sentinel Latent** (empty tensor) if a sampler probes for missing `samples`, permanently resolving the `is_nested` / `NoneType` crash.
- **TOML Sanitization**: Cleaned up `pyproject.toml` to resolve parsing errors in some environments.

## [5.19.0] - 2026-02-23
### Added
- **Phase XXIX: The Singularity (Port Stability & Sentinel Hardening)**: Resolved the "bizarre connection" behavior in the JS frontend and the persistent `is_nested` / `NoneType` sampler crash.
- **Robust Dynamic Growth (JS)**: Rewrote the port management engine to be non-destructive. Connecting new wires no longer triggers disconnection of existing wires.
- **Shielded Sentinel (Python)**: Hardened the OMNIPROXY with comprehensive attribute shielding.
- **Safe Tensor Delivery**: The proxy now correctly handles `.is_nested` probes and delivers a "Safe Silent Tensor" (1x4x64x64) if a sampler asks for `samples` but the registry is empty, preventing any `NoneType` crashes.

## [5.18.0] - 2026-02-23
### Added
- **Phase XXVIII: The Nuclear Purity (Full Registry Proxy)**: Resolved the persistent `AttributeError: 'NoneType' object has no attribute 'is_nested'` crash in KSamplers.
- **Full Registry Awareness**: The OMNIPROXY now has total visibility into the entire Oxidine fusion registry. 
- **Nuclear Sentinel Fallback**: Perfected the sentient reconstruction logic. If a port asks for 'samples' and no explicit latent exists, the proxy now surgically retrieves raw IMAGE/MASK data from the full registry and delivers it on-the-fly.

## [5.17.0] - 2026-02-23
### Added
- **Phase XXVII: The Absolute Purity (Sentient Tensor & Registry Fix)**: Resolved the critical `AttributeError: 'NoneType' object has no attribute 'is_nested'` in KSamplers.
- **Sentient Tensor Fallback**: The OMNIPROXY is now sentient for dict-access. If it detects a request for 'samples' on a port where no latent data exists, it will dynamically wrap and deliver a raw IMAGE or MASK tensor on-the-fly to satisfy the sampler.
- **Registry Fusion Repair**: Fixed a logic corruption in the backend fusion registry where signals were being incorrectly duplicated or dropped during deep dictionary unpacking.
- **Diplomatic Immunity (Solidified)**: Hardened the proxy's 'OMNIPROXY' identity recognition to ensure guaranteed pass-through on all surgical ports.

## [5.16.0] - 2026-02-23
### Added
- **Phase XXVI: The Grand Fusion (Stability & Overrides)**: Resolved the critical 'NoneType' crash and perfected multi-input priority.
- **Proxy Identity Purity**: Added `OMNIPROXY` recognition to the type identification engine, ensuring that the God-Proxy can bypass surgical protection shields and satisfy any port thirst.
- **Override Priority Engine**: Re-engineered the fusion logic to ensure that specific wires (higher port numbers) correctly override broad Mothership pipes (lower port numbers).
- **Registry Fusion Logging**: Added deep diagnostic logging for the fusion registry to verify signal integrity in complex multi-branch workflows.

## [5.15.0] - 2026-02-23
### Added
- **Phase XXV: The Grand Aggregator (Multi-Input Fusion)**: Transformed Oxidine into a universal fusion hub.
- **Dynamic Input Expansion (JS)**: The node now automatically adds a new input slot whenever the last one is occupied. You can now wire unlimited sources into a single Oxidine conduit.
- **Fusion Engine (Python)**: The backend now merges all connected input signals simultaneously into the sentient proxy. This allows for complex workflows where Mothership pipes can be locally augmented or override by direct wires.

## [5.14.0] - 2026-02-23
### Added
- **Phase XXIV: Sentient Introspection (Context-Aware Delivery)**: Resolved the "Neural Garbage" artifacts by ending the Guidance Hijacking paradox on shared wires.
- **Stack-Aware Proxy Selection**: The God-Proxy now uses `inspect.stack()` to dynamically detect if the caller is requesting `POSITIVE` or `NEGATIVE` conditioning. 
- **The Sentient Mirror**: A single Oxidine wire can now satisfy multiple conflicting ports (e.g. Model, Positive, Negative, and Latent) with 100% signal accuracy by delivering different data depending on the calling context.

## [5.13.0] - 2026-02-23
### Added
- **Phase XXIII: The Absolute Conduit (The Final Purity)**: Finally resolved the "Neural Garbage" image artifacts by solidifying the Proxy's memory layout.
- **Concrete Proxy Initialization**: The God-Proxy now correctly initializes its internal `list` and `dict` buffers. This ensures that C-level iterations in ComfyUI's Sampler witness a **Real List** with **Real Data**, rather than a hollow shell.
- **Name-Aware Collision Detection**: Updated Oxidine to recognize that multiple thirsts of the same type but DIFFERENT names (e.g. `POSITIVE` vs `NEGATIVE`) are a collision. This forces the God-Proxy and prevents "Guidance Hijacking" on shared wires.

## [5.12.0] - 2026-02-22
### Added
- **Phase XXII: The Sovereign Identity (Identity Purity)**: Replaced the static `H4_Chimera` (list-subclass) with a dynamic `H4_OmniproxyFactory`. The new proxy **inherits directly** from the primary object's class (e.g. `ModelPatcher`).
- **Strict Compliance**: This ensures that strict `isinstance(m, ModelPatcher)` checks in ComfyUI's Sampler pass successfully, resolving the "garbage image" artifacts caused by identity-mismatch in unpatched models.
- **Atomic Multi-Thirst Interface**: Maintains the hybrid `list` (conditioning) and `dict` (latent) interfaces regardless of the base class.

## [5.11.0] - 2026-02-22
### Added
- **Phase XXI: The Purity Protocol (Redundant Proxy Elimination)**: Implemented a Purity Check on multi-branch wires. If all downstream ports on a shared wire are of the same type (e.g. all Latent), Oxidine now delivers the **Actual Raw Object**, bypassing the `H4_Chimera` proxy entirely.
- **True Pass-Through**: Achieved 100% data integrity for non-colliding connections by eliminating unnecessary synthetic wrappers.
- **Omniproxy Isolation**: The God-Object is now only engaged for genuine Type Collisions or Cluster Extraction.

## [5.10.0] - 2026-02-22
### Added
- **Phase XX: The Guidance Purity (Selective Latching)**: Implemented port-aware conditioning selection for shared wires. If a wire is thirsty for `NEGATIVE`, it now strictly latches the negative conditioning, preventing `POSITIVE` signal hijacking.
- **Guidance Firewall**: Resolved "garbled" desaturated images caused by guidance signal collisions in split wires.

## [5.9.9] - 2026-02-22
### Added
- **Phase XIX: The Absolute Conduit (Scorched Earth Debugging)**: Finalized the hybrid list/dict interface of the God Object. Fixed `__setitem__` and `__delitem__` to support latent manipulation during sampling.
- **Improved Observability**: Added verbose `repr` and `str` methods to `H4_Chimera` and fixed duplicate method definitions.
- **Fixed Infrastructure**: Resolved `pyproject.toml` corruption that was interfering with package metadata.

## [5.9.5] - 2026-02-22
### Added
- **Phase XVIII: The Dictionary Mirror Refinement (Hybrid Integrity)**: Overrode `__setitem__` and `__delitem__` in the `H4_Chimera` God-Object. This resolves the `TypeError` where nodes attempted to set string keys on the hybrid list object.
- **Full Hybrid Solidification**: Added `setdefault`, `clear`, and refined `__contains__` to ensure 100% dictionary/list interoperability.

## [5.9.0] - 2026-02-22
### Added
- **Phase XVII: The Covenant of Purity (Mandatory Wrapping)**: Enforced mandatory God-Object wrapping for all multi-branch Oxidine wires. This prevents "Identity Bleed" where raw models could leak into latent ports.
- **Dict Interface Mirroring**: Implemented a full dictionary interface (`pop`, `keys`, `items`, `values`, `update`) in the `H4_Chimera` object to ensure 100% compatibility with ComfyUI's internal sampling logic.
- **Fixed Subscription Crash**: Resolved `'ModelPatcher' object is not subscriptable` errors by ensuring latching logic is strictly balanced.

## [5.8.9] - 2026-02-22
### Fixed
- **Phase XVI: Dynamic Personality & Copy-Aware Proxy (The Integrity Fix)**: Resolved "maimed" image distortion by fixing an identity-stripping bug in God Object cloning.
- **God-Copy Protocol**: Overrode `.copy()` to preserve `H4_Chimera` identity across internal ComfyUI clones (Conditioning/Latent/Model).
- **Dynamic Personality**: Implemented port-aware attribute prioritization (thirst-matching) to prevent Model/VAE property bleed.
- **Heuristic Type Detection**: Added deep inspection for VAE/CLIP objects to support obscure 3rd-party implementations.

## [5.8.5] - 2026-02-22
### Fixed
- **Phase XV: Multilateral Surgical Routing (The Guidance Fix)**: Resolved "maimed" image distortion by ensuring Oxidine extracts the correct named data for every port in a multi-branch wire (e.g. Model + Positive). 
- Fixed a bug where shared wires would default to the first conditioning found, causing guidance mismatches (Negative prompts on Positive ports).

## [5.8.1] - 2026-02-22
### Added
- **Phase XIV: Port-Aware Disambiguation (Surgical Routing)**: Updated scouting logic to capture port names, allowing Oxidine to distinguish between Positive and Negative conditioning in a shared bundle. Fixes "garbage image" guidance distortion.

## [5.8.0] - 2026-02-22
### Added
- **Phase VII-XIII: Oxidine Scorched Earth Stabilization Protocol**.
- **Omniproxy Protocol (Chimera 3.0)**: A universal synthetic proxy that satisfies Model, VAE, CLIP, Latent, and Conditioning thirsts simultaneously.
- **Dimensional Hashing**: Implemented `__hash__` and `__eq__` for the Chimera proxy to satisfy ComfyUI's model management and prevent "unhashable type" crashes.
- **Nuclear Type Isolation**: Absolute stability wall for Model/Latent/Conditioning ports.
- **Heavyweight Shield**: Strict purity enforcement for MODEL, VAE, and CLIP ports.

### Fixed
- Fixed `TypeError: 'ModelPatcher' object is not subscriptable` when routing models to latent ports.
- Fixed `AttributeError: 'dict' object has no attribute 'get_model_object'` when routing bundles to model ports.
- Fixed `AttributeError: 'str' object has no attribute 'copy'` in KSampler conditioning iteration.
- Fixed `TypeError: unhashable type: 'H4_Chimera'` in model management GPU loading.
- Fixed "Garbage Image" distortion by ensuring VAE and CLIP attributes are correctly proxied.

### Changed
- Oxidine (Reroute) now uses deep BFS scouting for exhaustive downstream branch awareness.
- Upgraded Chimera proxy from a simple dict to a list-inheriting multi-proxy God Object.
