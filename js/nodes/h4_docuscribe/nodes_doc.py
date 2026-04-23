
import os
import json
import folder_paths

class AnyType(str):
    """A special class that is always equal in not equal comparisons."""
    def __ne__(self, __value: object) -> bool:
        return False

any_type = AnyType("*")

class H4_DocuScribe:
    """
    H4 DocuScribe - The Workflow Documenter.
    Inspects connected nodes via the Graph API ('prompt' object) and generates a Markdown report.
    """
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "filename": ("STRING", {"default": "h4_Report_", "multiline": False}),
                "path": ("STRING", {"default": "h4_reports", "multiline": False}),
            },
            "optional": {
                "source_1": (any_type, {"tooltip": "Connect nodes here to document them."}),
            },
            "hidden": {
                "prompt": "PROMPT",
                "unique_id": "UNIQUE_ID",
            },
        }

    RETURN_TYPES = ()
    FUNCTION = "process_report"
    CATEGORY = "h4/Logic"
    OUTPUT_NODE = True

    def process_report(self, filename, path, prompt=None, unique_id=None, **kwargs):
        
        # 1. Harvest Connected Inputs
        # We need to find which inputs are connected.
        # But 'kwargs' only gives us the VALUES (Latents, Images), which contain NO metadata about the source node.
        # So we must inspect the 'prompt' (The Graph) using our own 'unique_id'.
        
        if prompt is None or unique_id is None:
            return {"ui": {"text": ["Error: Prompt/ID missing."]}}

        # Get the node data for THIS node
        my_node = prompt.get(str(unique_id))
        if not my_node:
             return {"ui": {"text": ["Error: Node not found in prompt."]}}
             
        my_inputs = my_node.get("inputs", {})
        
        # 2. The Spider: Crawl backwards
        report_lines = []
        report_lines.append(f"# 📝 Workflow Report: {filename}")
        report_lines.append("")
        report_lines.append("| Input | Node ID | Class Type | Name | Settings |")
        report_lines.append("| :--- | :--- | :--- | :--- | :--- |")
        
        # Sort inputs by source_X
        sorted_keys = sorted([k for k in my_inputs.keys() if k.startswith("source_")], key=lambda x: int(x.split("_")[1]) if "_" in x else 0)
        
        for input_key in sorted_keys:
            # ComfyUI Prompt Format for Link: [NodeID, OutputSlot]
            # connection = ["10", 0]
            connection = my_inputs[input_key]
            
            if not isinstance(connection, list):
                continue
                
            source_node_id = str(connection[0])
            source_node = prompt.get(source_node_id)
            
            if not source_node:
                report_lines.append(f"| {input_key} | {source_node_id} | ??? | Missing | N/A |")
                continue
                
            # Extract Details
            class_type = source_node.get("class_type", "Unknown")
            title = source_node.get("_meta", {}).get("title", class_type)
            inputs_config = source_node.get("inputs", {})
            
            # Format Settings
            # We want to format the inputs as key: value, but ignore connections (arrays)
            # Only keep primitives (widgets)
            settings_str = ""
            for k, v in inputs_config.items():
                if isinstance(v, list): continue # Skip links
                settings_str += f"**{k}**: `{v}`<br>"
            
            if not settings_str: settings_str = "*(Inputs inputs only)*"
            
            report_lines.append(f"| {input_key} | {source_node_id} | `{class_type}` | **{title}** | {settings_str} |")

        # 3. Write to File
        # Ensure directory
        base_output = folder_paths.get_output_directory()
        target_dir = os.path.join(base_output, path)
        os.makedirs(target_dir, exist_ok=True)
        
        full_path = os.path.join(target_dir, f"{filename}.md")
        
        report_text = "\n".join(report_lines)
        
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(report_text)
            
        return {"ui": {"text": [report_text], "markdown": [report_text]}}
