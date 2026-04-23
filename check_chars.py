
import os

log_path = r"d:\PROJECTS\COMFYUI_Custom_Node\h4_ToolKit_v2\comfyui_h4_live\House_Work_Files\logs.log"

with open(log_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "mid" in line:
        print(f"Line {i+1}: {line.strip()}")
        # Find "mid" and the characters following it
        idx = line.find("mid")
        segment = line[idx:idx+10]
        print(f"Segment: {segment}")
        for char in segment:
            print(f"  Char: '{char}' Hex: {hex(ord(char))} Name: {ord(char)}")
