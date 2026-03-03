import os
import re

root = os.path.join(os.getcwd(), 'nodes')
nodes_to_process = sorted([d for d in os.listdir(root) if os.path.isdir(os.path.join(root, d)) and not d.startswith('__')])

def format_name(cls_name):
    # Strip H4_
    base = cls_name.replace('H4_', '')
    
    # Custom Overrides for explicit naming
    overrides = {
        'Comparinator': 'Comparinator',
        'ComparinatorVault': 'Comparinator Vault',
        'DataStream': 'DataStream',
        'DebugErrorGenerator': 'Debug Error (TEST ONLY)',
        'Discombobulator': 'Discombobulator',
        'DoubleSampler': 'Double Sampler (Advanced)',
        'Gridinator': 'Gridinator',
        'LatentSelector': 'Latent Selector',
        'UniversalLoader': 'Universal Loader',
        'MissionControl': 'Mission Control',
        'ModelMerger': 'Model Merger',
        'ModelSave': 'Model Save',
        'NodeTranslator': 'Node Translator',
        'NoteInjector': 'Note Injector',
        'Oxidine': 'Oxidine',
        'PixelPress': 'Pixel Press',
        'PixelVisualizer': 'Pixel Visualizer',
        'SeedSequencer': 'Seed Sequencer',
        'SmartConsole': 'Smart Console (Debug)',
        'SmartSave': 'Smart Save',
        'TrafficCop': 'Traffic Cop (Splitter)',
        'TrafficMerge': 'Traffic Merge (Zipper)',
        'TrafficRouter': 'Traffic Router',
        'ImageBuffer': 'Universal Buffer',
        'LoopIncrementer': 'Loop Incrementer',
        'WirelessResetButton': 'Wireless Reset Button',
        'StateMonitor': 'State Monitor',
        'Varianator': 'Varianator',
        'VisualTokenizer': 'Visual Tokenizer'
    }
    
    if base in overrides:
        name = overrides[base]
    else:
        # Generic fallback
        words = re.findall(r'[A-Z]?[a-z]+|[A-Z]+(?=[A-Z]|$)|[0-9]+', base)
        if not words:
            words = [base]
        name = " ".join([w.title() for w in words])
        
    return f"h4 - {name}"

for node in nodes_to_process:
    init_py = os.path.join(root, node, '__init__.py')
    if not os.path.exists(init_py): continue
    
    with open(init_py, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if 'NODE_DISPLAY_NAME_MAPPINGS' not in content:
        continue
    
    # We will use regex to find and replace the dictionary values
    def repl(m):
        cls_key = m.group(1)
        # m.group(2) is the value, m.group(3) is the punctuation
        new_name = format_name(cls_key)
        return f'"{cls_key}": "{new_name}"'

    new_content = re.sub(r'"([^"]+)":\s*"[^"]+"', repl, content)
    
    if new_content != content:
        with open(init_py, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated names in {node}")

print("Done renaming.")
