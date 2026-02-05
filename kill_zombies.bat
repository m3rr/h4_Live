@echo off
echo 🧟 NUKING ZOMBIE PYTHON PROCESSES...
taskkill /F /IM python.exe /T
echo.
echo 💀 All Python processes have been terminated.
echo You can now restart ComfyUI.
pause
