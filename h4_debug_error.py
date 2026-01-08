# FILE: custom_nodes/comfyui_h4_live/h4_debug_error.py
# ------------------------------------------------------------------------------
# H4 Debug Error Generator
# A testing node that intentionally generates errors to test the error popup.
# This node is only visible when Debug Mode is enabled in settings.
# ------------------------------------------------------------------------------

class H4_DebugErrorGenerator:
    """
    🔬 Debug Error Generator
    
    This node intentionally generates errors to test the Death Modal error popup.
    It is ONLY visible when debug mode is enabled in settings.
    
    Use this to verify that:
    - The error popup appears correctly
    - Log sanitization is working
    - GitHub search links function properly
    - The Show Full Report window opens correctly
    """
    
    CATEGORY = "h4/debug"
    FUNCTION = "execute"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("status",)
    
    # Make this node always execute (don't cache)
    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "error_type": (["none", "minor", "warning", "critical"], {
                    "default": "none",
                    "tooltip": "Select the type of error to generate. 'none' = passthrough, others will crash intentionally."
                }),
                "trigger": ("BOOLEAN", {
                    "default": False,
                    "tooltip": "Toggle to TRUE to trigger the selected error. Set back to FALSE after testing."
                }),
            },
        }
    
    def execute(self, error_type: str, trigger: bool):
        """
        Generates an intentional error based on user selection.
        Only triggers when 'trigger' is True.
        """
        if not trigger:
            return ("Debug Error Generator: Standby. Set trigger=True to test.",)
        
        if error_type == "none":
            return ("Debug Error Generator: No error selected. Choose minor/warning/critical.",)
        
        # Generate intentional errors based on type
        if error_type == "minor":
            # Minor: Simple ValueError
            raise ValueError(
                "[h4 DEBUG] Minor Error Test: This is a simulated minor error. "
                "If you see this in the Death Modal, it's working correctly! "
                "Path test: C:\\Users\\TestUser\\Documents\\test.txt"
            )
        
        elif error_type == "warning":
            # Warning: RuntimeError with more detail
            raise RuntimeError(
                "[h4 DEBUG] Warning Error Test: This is a simulated warning-level error. "
                "This error includes fake sensitive data for sanitization testing: "
                "Email: test@example.com | IP: 192.168.1.100 | "
                "Path: C:\\Users\\SensitiveUsername\\AppData\\Local\\ComfyUI\\test.py"
            )
        
        elif error_type == "critical":
            # Critical: Exception with full traceback simulation
            try:
                # Create a nested error for a longer traceback
                self._trigger_nested_error()
            except Exception as e:
                raise Exception(
                    "[h4 DEBUG] CRITICAL Error Test: This is a simulated critical system failure! "
                    "Network path test: \\\\MYSERVER\\SharedFolder\\secrets.txt | "
                    "Home path test: /home/testuser/.config/comfyui/settings.json | "
                    f"Inner error: {e}"
                ) from e
        
        return ("Error should have been raised",)
    
    def _trigger_nested_error(self):
        """Helper to create a nested error for deeper traceback."""
        def level_3():
            raise KeyError("Nested level 3: Fake key 'model_config' not found")
        
        def level_2():
            level_3()
        
        def level_1():
            level_2()
        
        level_1()


# Export for __init__.py
NODE_CLASS_MAPPINGS = {
    "H4_DebugErrorGenerator": H4_DebugErrorGenerator
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "H4_DebugErrorGenerator": "🔬 h4 Debug Error (TEST ONLY)"
}
