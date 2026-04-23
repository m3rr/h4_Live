
import os

log_path = r"d:\PROJECTS\COMFYUI_Custom_Node\h4_ToolKit_v2\comfyui_h4_live\House_Work_Files\logs.log"

with open(log_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

line_23 = lines[22] # 0-indexed
print(f"Line 23: {line_23.strip()}")
idx = line_23.find("mid")
if idx != -1:
    segment = line_23[idx:idx+10]
    print(f"Segment: {segment}")
    for char in segment:
        print(f"  Char: '{char}' Hex: {hex(ord(char))} Name: {ord(char)}")
else:
    print("mid not found in line 23")
