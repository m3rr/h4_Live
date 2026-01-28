# FILE: custom_nodes/comfyui_h4_live/h4_axis.py
# ------------------------------------------------------------------------------
# H4 Axis Driver (Ported from ToolKit)
# "Structured Presets for The Engine."
# 
# This module provides the H4_AxisDriver node, which outputs JSON configurations
# for X/Y/Z plot axes. It includes all necessary helper functions to normalise
# and validate the axis state.
# ------------------------------------------------------------------------------

import json
import copy
from typing import Any, Dict, List, Optional, Tuple
from .h4_core import _log

# ------------------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------------------
AXIS_DRIVER_MAX_ITEMS = 8
AXIS_DRIVER_SLOT_ORDER: Tuple[str, ...] = ("X", "Y", "Z")
AXIS_DRIVER_SUPPORTED_PRESETS: Tuple[str, ...] = (
    "none", "prompt", "checkpoint", "lora", "sampler",
    "scheduler", "steps", "cfg", "denoise", "seed",
)

AXIS_DRIVER_PRESET_DEFAULTS: Dict[str, str] = {
    "X": "checkpoint",
    "Y": "prompt",
    "Z": "none",
}

AXIS_DRIVER_DEFAULT_STYLE: Dict[str, Any] = {
    "font_size": 22,
    "font_family": "DejaVuSans",
    "font_colour": "#FFFFFF",
    "background": "black60",
    "alignment": "center",
    "label_position": "top_left",
    "label_layout": "overlay",
    "custom_label_x": "X",
    "custom_label_y": "Y",
    "custom_label_z": "Z",
    "show_axis_headers": True,
}

AXIS_DRIVER_DEFAULT_STATE: Dict[str, Any] = {
    "axes": [
        {"slot": "X", "preset": "checkpoint", "items": []},
        {"slot": "Y", "preset": "prompt", "items": []},
        {"slot": "Z", "preset": "none", "items": []},
    ],
    "style": AXIS_DRIVER_DEFAULT_STYLE,
}

# ------------------------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------------------------

def _axis_driver_default_state() -> Dict[str, Any]:
    return copy.deepcopy(AXIS_DRIVER_DEFAULT_STATE)

def _axis_driver_normalise_style(raw: Any) -> Dict[str, Any]:
    style = copy.deepcopy(AXIS_DRIVER_DEFAULT_STYLE)
    if isinstance(raw, dict):
        for key, value in raw.items():
            if key in style:
                style[key] = value
    return style

def _axis_driver_normalise_item(preset: str, raw: Any) -> Dict[str, Any]:
    payload = raw if isinstance(raw, dict) else {}
    label = str(payload.get("label") or payload.get("source_label") or "").strip()
    value = payload.get("value")
    if value is None and "raw_value" in payload:
        value = payload.get("raw_value")
    overrides = payload.get("overrides")
    overrides = overrides if isinstance(overrides, dict) else {}
    strength_raw = payload.get("strength")
    strength: Optional[float]
    if preset == "lora":
        try:
            strength = float(strength_raw)
        except (TypeError, ValueError):
            strength = 0.75
    else:
        strength = None
    return {
        "label": label,
        "value": value,
        "strength": strength,
        "overrides": copy.deepcopy(overrides),
    }

def _axis_driver_normalise_axis(slot: str, raw: Any) -> Dict[str, Any]:
    preset_default = AXIS_DRIVER_PRESET_DEFAULTS.get(slot, "none")
    payload = raw if isinstance(raw, dict) else {}
    preset_raw = str(payload.get("preset") or preset_default).lower()
    preset = preset_raw if preset_raw in AXIS_DRIVER_SUPPORTED_PRESETS else preset_default
    items_raw = payload.get("items") if isinstance(payload, dict) else None
    items: List[Dict[str, Any]] = []
    if isinstance(items_raw, list):
        for entry in items_raw[:AXIS_DRIVER_MAX_ITEMS]:
            items.append(_axis_driver_normalise_item(preset, entry))
    return {"slot": slot, "preset": preset, "items": items}

def _axis_driver_normalise_state(raw: Any) -> Dict[str, Any]:
    state = _axis_driver_default_state()
    if not isinstance(raw, dict):
        return state

    state["style"] = _axis_driver_normalise_style(raw.get("style"))
    slot_lookup = {axis["slot"]: axis for axis in state["axes"]}
    axes_raw = raw.get("axes")
    if isinstance(axes_raw, list):
        for entry in axes_raw:
            slot = str(entry.get("slot") if isinstance(entry, dict) else "").upper()
            if slot in slot_lookup:
                slot_lookup[slot].update(_axis_driver_normalise_axis(slot, entry))
    
    # Ensure order and fallback defaults are preserved
    ordered_axes: List[Dict[str, Any]] = []
    for slot in AXIS_DRIVER_SLOT_ORDER:
        base_axis = slot_lookup.get(slot, _axis_driver_normalise_axis(slot, {}))
        if base_axis.get("preset") not in AXIS_DRIVER_SUPPORTED_PRESETS:
            base_axis["preset"] = AXIS_DRIVER_PRESET_DEFAULTS.get(slot, "none")
        if not isinstance(base_axis.get("items"), list):
            base_axis["items"] = []
        base_axis["items"] = base_axis["items"][:AXIS_DRIVER_MAX_ITEMS]
        ordered_axes.append(base_axis)
    state["axes"] = ordered_axes
    return state

def _axis_driver_parse_config(config_text: str) -> Dict[str, Any]:
    if not isinstance(config_text, str) or not config_text.strip():
        return _axis_driver_default_state()
    try:
        raw = json.loads(config_text)
    except Exception:
        # Replaced GLOBAL_LOGGER with _log
        _log("[H4_AxisDriver] ⚠️ Config parse failed; reverting to defaults")
        return _axis_driver_default_state()
    return _axis_driver_normalise_state(raw)

def _axis_driver_slot_payload(state: Dict[str, Any], slot: str) -> Dict[str, Any]:
    axes = state.get("axes") if isinstance(state, dict) else None
    axis: Optional[Dict[str, Any]] = None
    if isinstance(axes, list):
        for entry in axes:
            if isinstance(entry, dict) and entry.get("slot") == slot:
                axis = entry
                break
    if axis is None:
        axis = _axis_driver_normalise_axis(slot, {})
    payload_items: List[Dict[str, Any]] = []
    for item in axis.get("items", []):
        if not isinstance(item, dict):
            continue
        payload_items.append(
            {
                "label": str(item.get("label") or ""),
                "value": item.get("value"),
                "strength": item.get("strength"),
                "overrides": copy.deepcopy(item.get("overrides") if isinstance(item.get("overrides"), dict) else {}),
            }
        )
    return {
        "slot": slot,
        "preset": axis.get("preset", "none"),
        "items": payload_items,
        "style": copy.deepcopy(state.get("style", {})),
    }

def _axis_driver_legacy_summary(state: Dict[str, Any]) -> str:
    lines: List[str] = []
    axes = state.get("axes") if isinstance(state, dict) else []
    for axis in axes:
        if not isinstance(axis, dict):
            continue
        slot = axis.get("slot", "?")
        preset = axis.get("preset", "none")
        header = f"Axis {slot} ({preset})"
        items = axis.get("items") if isinstance(axis.get("items"), list) else []
        if not items or preset == "none":
            lines.append(f"{header}: <disabled>")
            continue
        for item in items:
            if not isinstance(item, dict):
                continue
            label = item.get("label") or item.get("value") or ""
            strength = item.get("strength")
            if preset == "lora" and strength is not None:
                lines.append(f"{header}: {label} @ {strength}")
            else:
                lines.append(f"{header}: {label}")
    style = state.get("style") if isinstance(state, dict) else None
    if isinstance(style, dict):
        layout = style.get("label_layout", "overlay")
        lines.append(f"Style: layout={layout}, font={style.get('font_family', 'default')} size={style.get('font_size', 22)}")
    return "\n".join(lines)

# ------------------------------------------------------------------------------
# Node Definition
# ------------------------------------------------------------------------------

class H4_AxisDriver:
    """
    Companion node that serialises structured axis presets for The Engine (Gridinator).
    Standardized Class Name: H4_AxisDriver (ToolKit name was h4_AxisDriver)
    """

    @classmethod
    def INPUT_TYPES(cls) -> Dict[str, Any]:
        default_config = json.dumps(AXIS_DRIVER_DEFAULT_STATE, indent=2)
        return {
            "required": {
                "config": (
                    "STRING",
                    {
                        "default": default_config,
                        "multiline": True,
                        "tooltip": "JSON Payload from JS Widget",
                    },
                )
            }
        }

    RETURN_TYPES = ("STRING", "STRING", "STRING", "STRING")
    RETURN_NAMES = ("axis_x", "axis_y", "axis_z", "legacy_summary")
    FUNCTION = "emit"
    CATEGORY = "h4_Live/GridTools" # Moved to match live structure

    def __init__(self) -> None:
        pass

    def emit(self, config: str) -> Tuple[str, str, str, str]:
        state = _axis_driver_parse_config(config)
        normalised = json.dumps(state, indent=2)
        
        # Trace log if normalised changed (optional)
        # if normalised != config:
        #     _log("[H4_AxisDriver] Config normalised")
            
        slot_payloads = {
            slot: json.dumps(_axis_driver_slot_payload(state, slot), indent=2)
            for slot in AXIS_DRIVER_SLOT_ORDER
        }
        summary = _axis_driver_legacy_summary(state)
        return (
            slot_payloads.get("X", ""),
            slot_payloads.get("Y", ""),
            slot_payloads.get("Z", ""),
            summary,
        )
