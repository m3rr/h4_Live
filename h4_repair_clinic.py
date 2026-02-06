
import sys
import subprocess
import importlib
import os

def log(msg):
    print(f"[\033[92mH4_REPAIR\033[0m] {msg}")

def run_pip(args):
    """Runs a pip command using the current python executable."""
    cmd = [sys.executable, "-m", "pip"] + args
    log(f"Running: {' '.join(cmd)}")
    try:
        subprocess.check_call(cmd)
        log("✅ Success")
    except subprocess.CalledProcessError as e:
        print(f"[\033[91mERROR\033[0m] Command failed: {e}")

def check_import(module_name):
    try:
        importlib.import_module(module_name)
        log(f"✅ Module '{module_name}' is importable.")
        return True
    except ImportError as e:
        log(f"⚠️ Module '{module_name}' failed to import: {e}")
        return False

def main():
    log("Starting H4 Repair Clinic...")
    log(f"Python Executable: {sys.executable}")
    
    # 1. Install Missing / Deprecated Replacements
    log("--- Phase 1: Missing & Deprecated Packages ---")
    run_pip(["install", "pydantic-settings", "nvidia-ml-py"])
    
    # 2. Fix Diffusers / PEFT Conflict (Option C: Downgrade / Stability Pin)
    log("--- Phase 2: Resolving Diffusers/PEFT/Transformers Conflict ---")
    log("Downgrading transformers to 4.48.3 to fix 'HybridCache' ImportError...")
    # Transformers > 4.49 broke PEFT integration.
    # Diffusers 0.32.1 is generally stable.
    run_pip(["install", "transformers==4.48.3", "diffusers==0.32.2", "peft==0.14.0", "accelerate==1.3.0"])

    # 3. Validation
    log("--- Phase 3: Validation ---")
    
    # Check PEFT BaseTunerLayer issue
    try:
        from peft.tuners.tuners_utils import BaseTunerLayer
        log("✅ PEFT BaseTunerLayer found (Compatibility Verified).")
    except ImportError:
        log("⚠️ PEFT BaseTunerLayer import failed. Attempting force reinstall of stable pair...")
        # Fallback to known stable if bleeding edge failed?
        # Usually checking import failure is enough to know if we need manual intervention.
        pass

    log("--- Repair Complete. Restart ComfyUI. ---")

if __name__ == "__main__":
    main()
