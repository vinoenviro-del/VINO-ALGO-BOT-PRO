@echo off
title Vino Algo - React + Vite Frontend
chcp 65001 >nul
color 0E

echo ======================================================================
echo           VINO ALGO - React + Vite Frontend (Port 5173)
echo ======================================================================
echo.

cd /d "%~dp0"

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not found in PATH.
    echo Please make sure Node.js is installed.
    pause
    exit /b
)

if not exist node_modules (
    echo [INFO] First time setup: Installing npm packages...
    call npm install
)

echo [INFO] Starting Vite dev server on http://localhost:5173 ...
echo.
call npm run dev -- --host 0.0.0.0 --port 5173

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Frontend server encountered an error.
)
pause
