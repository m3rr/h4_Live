# FILE: custom_nodes/comfyui_h4_live/h4_seed_sequencer.py
# ------------------------------------------------------------------------------
# H4 Seed Sequencer (Ported from ToolKit's h4_SeedBroadcaster)
# "Controlled Chaos."
# 
# Renamed from 'Broadcaster' to 'Sequencer' to avoid confusion.
# Features unique logic:
# - Random Digits Control (e.g. 4-digit seeds)
# - Internal sequencing (Independent of global loop)
# ------------------------------------------------------------------------------

import secrets
from typing import Any, Dict, Optional, Tuple
from .h4_core import _log

class H4_SeedSequencer:
    """
    Utility node that generates reproducible seeds with lightweight sequencing.
    (Formerly h4_SeedBroadcaster)
    """

    @classmethod
    def INPUT_TYPES(cls) -> Dict[str, Any]:
        return {
            "required": {
                "seed": (
                    "INT",
                    {
                        "default": 123456789,
                        "min": 0,
                        "max": 2**63 - 1,
                        "tooltip": "Base seed anchor.",
                    },
                ),
                "mode": (
                    ["fixed", "increment", "random"],
                    {
                        "default": "fixed",
                        "tooltip": "Fixed: Static. Increment: +step. Random: Chaos.",
                    },
                ),
                "increment_step": (
                    "INT",
                    {
                        "default": 1,
                        "min": 1,
                        "max": 2**31 - 1,
                        "tooltip": "How much to verify by in increment mode.",
                    },
                ),
                "auto_advance": (
                    "BOOLEAN",
                    {
                        "default": True,
                        "tooltip": "If True, updates internal state for next run.",
                    },
                ),
                "random_digits": (
                    "INT",
                    {
                        "default": 10,
                        "min": 1,
                        "max": 12,
                        "tooltip": "Number of digits for random generation (e.g. 4 = 1000-9999).",
                    },
                ),
            }
        }

    RETURN_TYPES = ("INT",)
    RETURN_NAMES = ("seed",)
    FUNCTION = "generate"
    CATEGORY = "h4_Live/MissionControl"

    def __init__(self) -> None:
        self._current_seed: Optional[int] = None
        self._anchor_seed: Optional[int] = None
        self._last_mode: Optional[str] = None
        self._last_random_digits: int = 10
        self._last_emitted_seed: Optional[int] = None

    @staticmethod
    def _coerce_seed(value: Optional[Any]) -> int:
        try:
            integer = int(value)
        except (TypeError, ValueError):
            integer = 0
        limit = 2**63 - 1
        return max(0, min(integer, limit))

    @staticmethod
    def _normalise_mode(mode: Optional[str]) -> str:
        if not mode:
            return "fixed"
        candidate = str(mode).strip().lower()
        return candidate if candidate in {"fixed", "increment", "random"} else "fixed"

    @staticmethod
    def _normalise_step(value: Optional[Any]) -> int:
        try:
            step = int(value)
        except (TypeError, ValueError):
            step = 1
        return max(1, min(step, 2**31 - 1))

    @staticmethod
    def _normalise_digits(value: Optional[Any]) -> int:
        try:
            digits = int(value)
        except (TypeError, ValueError):
            digits = 10
        return max(1, min(digits, 12))

    def _generate_random_seed(self, digits: int) -> int:
        digits = self._normalise_digits(digits)
        upper_bound = min(10**digits - 1, 2**63 - 1)
        lower_bound = 0 if digits == 1 else 10 ** (digits - 1)
        span = upper_bound - lower_bound + 1
        return lower_bound + secrets.randbelow(span)

    def generate(
        self,
        seed: int,
        mode: str,
        increment_step: int,
        auto_advance: bool,
        random_digits: int,
    ) -> Tuple[int]:
        base_seed = self._coerce_seed(seed)
        mode_normalised = self._normalise_mode(mode)
        step = self._normalise_step(increment_step)
        digits = self._normalise_digits(random_digits)
        auto_flag = bool(auto_advance)

        changed_mode = mode_normalised != self._last_mode
        base_changed = self._anchor_seed is None or base_seed != self._anchor_seed
        digits_changed = mode_normalised == "random" and digits != self._last_random_digits

        need_reset = (
            self._current_seed is None
            or changed_mode
            or digits_changed
            or (base_changed and mode_normalised != "random")
        )
        manual_override = (
            mode_normalised == "random"
            and base_changed
            and not changed_mode
            and not digits_changed
        )

        if need_reset:
            if mode_normalised == "random" and not base_changed:
                self._current_seed = self._generate_random_seed(digits)
            else:
                self._current_seed = base_seed
                if mode_normalised == "random" and base_changed:
                    _log(f"[Seed Sequencer] Manual override detected; adopting seed {self._current_seed}")
        elif manual_override:
            self._current_seed = base_seed

        result = int(self._current_seed or 0)

        if auto_flag:
            if mode_normalised == "increment":
                next_seed = self._coerce_seed(result + step)
                self._current_seed = next_seed
            elif mode_normalised == "random":
                self._current_seed = self._generate_random_seed(digits)
            else:
                self._current_seed = base_seed
        else:
            self._current_seed = result

        self._anchor_seed = base_seed
        self._last_mode = mode_normalised
        self._last_random_digits = digits

        if self._last_emitted_seed != result:
            _log(f"[Seed Sequencer] mode={mode_normalised} auto={'on' if auto_flag else 'off'} emitted seed {result}")
        else:
             # Reduced log noise for same seed
             pass 
             
        self._last_emitted_seed = result
        return (result,)
