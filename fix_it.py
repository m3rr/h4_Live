import os
import re

# Parse old_init_2.txt to extract the global mappings
with open('old_init_2.txt', 'r', encoding='utf-8') as f:
    old_init = f.read()

class_map = {}
display_map = {}

class_block = re.search(r'NODE_CLASS_MAPPINGS\s*=\s*{(.*?)}', old_init, re.DOTALL)
if class_block:
    for line in class_block.group(1).splitlines():
        match = re.search(r'\"([^\"]+)\":\s*([a-zA-Z0-9_]+)', line)
        if match:
            class_map[match.group(2)] = match.group(1)

display_block = re.search(r'NODE_DISPLAY_NAME_MAPPINGS\s*=\s*{(.*?)}', old_init, re.DOTALL)
if display_block:
    for line in display_block.group(1).splitlines():
        match = re.search(r'\"([^\"]+)\":\s*\"([^\"]+)\"', line)
        if match:
            display_map[match.group(1)] = match.group(2)

if 'H4_PixelVisualizer' not in class_map: class_map['H4_PixelVisualizer'] = 'H4_PixelVisualizer'
if 'H4_PixelVisualizer' not in display_map: display_map['H4_PixelVisualizer'] = 'h4 - Pixel Visualizer'

nodes_dir = 'nodes'
nodes_to_process = [d for d in os.listdir(nodes_dir) if os.path.isdir(os.path.join(nodes_dir, d)) and not d.startswith('__')]

for node in nodes_to_process:
    nodes_py = os.path.join(nodes_dir, node, 'nodes.py')
    init_py = os.path.join(nodes_dir, node, '__init__.py')
    
    if os.path.exists(nodes_py):
        with open(nodes_py, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = re.sub(r'from\s+\.\.core', 'from ...core', content)
        new_content = re.sub(r'\n*NODE_CLASS_MAPPINGS\s*=\s*{.*', '', new_content, flags=re.DOTALL)
        
        with open(nodes_py, 'w', encoding='utf-8') as f:
            f.write(new_content)
            
        classes = re.findall(r'class\s+(H4_\w+)\s*:', new_content)
        if not classes:
            continue
            
        my_class_map = {}
        my_disp_map = {}
        
        for cls_name in classes:
            if cls_name in class_map:
                key = class_map[cls_name]
                disp = display_map.get(key, cls_name.replace('_', ' '))
                my_class_map[key] = cls_name
                my_disp_map[key] = disp
                
        if node == 'h4_faceforge':
            continue
        if node == 'h4_update_version':
            continue
            
        if not my_class_map:
            with open(init_py, 'w', encoding='utf-8') as f:
                f.write('# Utility module. Not a ComfyUI node.\n')
            continue
            
        init_content = ''
        init_content += f'from .nodes import {", ".join(my_class_map.values())}\n\n'
        init_content += 'NODE_CLASS_MAPPINGS = {\n'
        for k, v in my_class_map.items():
            init_content += f'    "{k}": {v},\n'
        init_content += '}\n\n'
        
        init_content += 'NODE_DISPLAY_NAME_MAPPINGS = {\n'
        for k, v in my_disp_map.items():
            init_content += f'    "{k}": "{v}",\n'
        init_content += '}\n'
        
        with open(init_py, 'w', encoding='utf-8') as f:
            f.write(init_content)
            
print('Completed the restoration script.')
