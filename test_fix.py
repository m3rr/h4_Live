
import re

def _nuclear_log(msg, level="INFO"):
    print(f"[{level}] {msg}")

def test_replacement():
    # Simulate User's Prompt with Non-Breaking Hyphen (0x2011)
    # Line 23 from logs.log: "Photorealistic cinematic 35mm photo of cute goth young adult woman, mid‑20s"
    prompt = "Photorealistic cinematic 35mm photo of cute goth young adult woman, mid\u201120s"
    
    # User's Search Target (Standard Hyphen 0x2d)
    target = "mid-20s"
    replacement = "oompa loompa"
    
    case_sensitive = False
    regex_mode = False
    
    print(f"Original Prompt: {prompt}")
    print(f"Target: {target}")
    
    working_buffer = prompt
    
    # Logic from the node:
    if not case_sensitive and not regex_mode:
        p_str = re.escape(target)
        p_str = p_str.replace(r"\-", r"[\-\u2011\u2013\u2014]")
        p_str = p_str.replace(r"\'", r"[\'\u2018\u2019]")
        p_str = p_str.replace(r"\"", r"[\"\u201C\u201D]")
        p_str = p_str.replace(r"\ ", r"[\ \u00A0]")
        
        pattern = re.compile(p_str, re.IGNORECASE)
        working_buffer, count = pattern.subn(lambda m: replacement, working_buffer)
        print(f"Count: {count}")
        print(f"New Prompt: {working_buffer}")

    if "oompa loompa" in working_buffer:
        print("TEST PASSED: Substitution successful!")
    else:
        print("TEST FAILED: Substitution missed.")

if __name__ == "__main__":
    test_replacement()
