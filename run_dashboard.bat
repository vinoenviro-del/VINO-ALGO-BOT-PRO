@echo off
title Vino Nifty 50 Bot - Localhost Dashboard
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
color 0A

echo ======================================================================
echo           Vino Nifty 50 + Stocks Combo Bot - Web Server
echo ======================================================================
echo.

cd /d "%~dp0"

:: Check if python is available
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in your PATH.
    echo Please ensure Python is installed and added to PATH.
    pause
    exit /b
)

:: Launch browser after a short delay in background
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:5000"

:: Start the Python Localhost Dashboard Server
echo Starting Localhost Web Server on http://localhost:5000...
echo.
python app.py

pause
