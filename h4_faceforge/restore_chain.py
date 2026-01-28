# h4_faceforge/restore_chain.py
# Module for loading face restoration models
# Replaces ReActor's r_chainner.model_loading

from .restore_arch import GFPGANv1Clean
import logging

class UnsupportedModel(Exception):
    pass

def load_state_dict(state_dict):
    """
    Load state dictionary into a restoration model.
    Currently supports GFPGANv1Clean architecture.
    """
    state_dict_keys = list(state_dict.keys())

    if "params_ema" in state_dict_keys:
        state_dict = state_dict["params_ema"]
    elif "params-ema" in state_dict_keys:
        state_dict = state_dict["params-ema"]
    elif "params" in state_dict_keys:
        state_dict = state_dict["params"]

    state_dict_keys = list(state_dict.keys())

    # GFPGAN detection heuristic
    if (
        "toRGB.0.weight" in state_dict_keys
        and "stylegan_decoder.style_mlp.1.weight" in state_dict_keys
    ):
        model = GFPGANv1Clean(state_dict)
        return model
        
    # If not recognized, try returning None or raising
    # ReActor's code only handles GFPGAN here explicitly
    return None

class model_loading:
    """
    Namespace class to match ReActor's import structure:
    from .restore_chain import model_loading
    model = model_loading.load_state_dict(sd)
    """
    @staticmethod
    def load_state_dict(sd):
        return load_state_dict(sd)
