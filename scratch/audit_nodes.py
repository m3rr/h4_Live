import os
import json
import ast

def audit_nodes():
    nodes_dir = "nodes"
    book_path = os.path.join("nodes", "h4_smart_save", "Lore", "The_Book_of_H4.json")
    
    with open(book_path, "r", encoding="utf-8") as f:
        book = json.load(f)
        
    all_registered_nodes = set()
    
    for folder in os.listdir(nodes_dir):
        folder_path = os.path.join(nodes_dir, folder)
        if not os.path.isdir(folder_path) or folder.startswith("__"):
            continue
            
        init_path = os.path.join(folder_path, "__init__.py")
        if os.path.exists(init_path):
            with open(init_path, "r", encoding="utf-8") as f:
                tree = ast.parse(f.read())
                for node in tree.body:
                    if isinstance(node, ast.Assign):
                        for target in node.targets:
                            if isinstance(target, ast.Name) and target.id == "NODE_CLASS_MAPPINGS":
                                if isinstance(node.value, ast.Dict):
                                    for key in node.value.keys:
                                        if isinstance(key, ast.Constant):
                                            all_registered_nodes.add(key.value)
                                        elif isinstance(key, ast.Str): # Support for older python versions
                                            all_registered_nodes.add(key.s)
                                            
    missing = sorted([n for n in all_registered_nodes if n not in book])
    
    print("--- AUDIT RESULTS ---")
    if not missing:
        print("All registered nodes are documented in The Book of H4.")
    else:
        print("Missing Entries:")
        for m in missing:
            print(f"- {m}")
    print("---------------------")

if __name__ == "__main__":
    audit_nodes()
