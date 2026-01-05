import os
import re

# ------------------------------------------------------------------------------
# CONFIGURATION
# ------------------------------------------------------------------------------
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
VERSION_FILE = os.path.join(ROOT_DIR, "version.py")
TOML_FILE = os.path.join(ROOT_DIR, "pyproject.toml")
README_FILE = os.path.join(ROOT_DIR, "README.md")

# ------------------------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------------------------
def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write_file(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def get_current_version():
    content = read_file(VERSION_FILE)
    match = re.search(r'__version__\s*=\s*"([^"]+)"', content)
    if match:
        return match.group(1)
    return None

def increment_version(v_str):
    # Regex to find the last number to increment
    # Logic: Look for the last sequence of digits.
    # Case: "1.0.0" -> "1.0.1"
    # Case: "1.0.0-beta" -> "1.0.0-beta" (wait, does 'tick' increment patch?)
    
    # Let's assume standard SemVer: Major.Minor.Patch(-Suffix)
    # We strip suffix, increment patch, put suffix back? 
    # Or just increment the last number found?
    
    # APPROACH: Find the SemVer core "X.Y.Z"
    match = re.search(r'(\d+)\.(\d+)\.(\d+)(.*)', v_str)
    if match:
        major, minor, patch, suffix = match.groups()
        new_patch = int(patch) + 1
        return f"{major}.{minor}.{new_patch}{suffix}"
    return v_str # Fallback

def update_version_py(new_ver):
    content = read_file(VERSION_FILE)
    new_content = re.sub(r'__version__\s*=\s*"([^"]+)"', f'__version__ = "{new_ver}"', content)
    write_file(VERSION_FILE, new_content)
    print(f"✅ Updated version.py to {new_ver}")

def update_toml(new_ver):
    content = read_file(TOML_FILE)
    # Be careful not to replace other "version" keys if they exist (though pyproject usually has one main)
    # We look for 'version = "..."' under [project] ideally, but strict regex is okay
    new_content = re.sub(r'version\s*=\s*"([^"]+)"', f'version = "{new_ver}"', content, count=1)
    write_file(TOML_FILE, new_content)
    print(f"✅ Updated pyproject.toml to {new_ver}")

def update_readme(new_ver):
    content = read_file(README_FILE)
    
    # Badge formatting: Desired "version-2.2.2--beta-blueviolet"
    # If the version has dashes (e.g. -beta), shields.io needs them escaped as "--"
    badge_ver = new_ver.replace("-", "--")
    
    # Regex for badge: ![Version](https://img.shields.io/badge/version-XXXX-blueviolet)
    # We look for "version-....-blueviolet"
    
    pattern = r'(https://img.shields.io/badge/version-)(.+?)(-blueviolet)'
    
    def repl(m):
        return f"{m.group(1)}{badge_ver}{m.group(3)}"
        
    new_content = re.sub(pattern, repl, content)
    write_file(README_FILE, new_content)
    print(f"✅ Updated README.md badge to {badge_ver}")

# ------------------------------------------------------------------------------
# MAIN
# ------------------------------------------------------------------------------
def main():
    print("\n-------------------------------------------")
    print(" 🚀 h4_Live Version Manager")
    print("-------------------------------------------\n")

    current_ver = get_current_version()
    if not current_ver:
        print("❌ Error: Could not find __version__ in version.py")
        return

    print(f"Current Version: \033[96m{current_ver}\033[0m")
    
    # calculate next tick
    tick_ver = increment_version(current_ver)
    
    print(f"\n[1] Tick ({tick_ver})")
    print(f"[2] Manual Entry")
    
    choice = input("\nSelect Option [1/2]: ").strip()
    
    target_version = ""
    
    if choice == "1":
        target_version = tick_ver
    elif choice == "2":
        target_version = input("Enter new version string (e.g. 2.3.0): ").strip()
    else:
        print("Invalid choice.")
        return

    if not target_version:
        print("Aborted.")
        return

    print(f"\nUpdating files to: \033[92m{target_version}\033[0m ...\n")
    
    try:
        update_version_py(target_version)
        update_toml(target_version)
        update_readme(target_version)
        print("\n✨ Version Update Complete!")
    except Exception as e:
        print(f"\n❌ An error occurred: {e}")

if __name__ == "__main__":
    main()
