@echo off
title Vino Algo - Alice Blue Antares Launcher
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
color 0A

echo ======================================================================
echo          VINO ALGO - Alice Blue Antares Trading System
echo          FastAPI Backend + React / Vite Frontend
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Launching FastAPI Backend Window (Port 8000)...
start "Vino Algo - Backend (Port 8000)" cmd /k "cd /d "%~dp0backend" && call run_backend.bat"

echo [2/3] Launching Vite Frontend Window (Port 5173)...
start "Vino Algo - Frontend (Port 5173)" cmd /k "cd /d "%~dp0frontend" && call run_frontend.bat"

echo [3/3] Opening browser at http://localhost:5173 in 4 seconds...
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:5173"

echo.
echo ======================================================================
echo Both Backend (http://127.0.0.1:8000) and Frontend (http://127.0.0.1:5173)
echo have been launched in separate Command Prompt windows!
echo Keep those command prompt windows open while trading.
echo ======================================================================
echo.
pause
