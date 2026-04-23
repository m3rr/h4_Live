
import os

log_path = r"d:\PROJECTS\COMFYUI_Custom_Node\h4_ToolKit_v2\comfyui_h4_live\House_Work_Files\logs.log"

with open(log_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

line_5 = lines[4] # 0-indexed
print(f"Line 5: {line_5.strip()}")
idx = line_5.find("mid")
if idx != -1:
    segment = line_5[idx:idx+10]
    print(f"Segment: {segment}")
    for char in segment:
        print(f"  Char: '{char}' Hex: {hex(ord(char))} Name: {ord(char)}")
