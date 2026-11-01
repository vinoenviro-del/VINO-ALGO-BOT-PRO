@echo off
title Vino Algo - FastAPI Backend
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
color 0B

echo ======================================================================
echo           VINO ALGO - Alice Blue FastAPI Backend (Port 8000)
echo ======================================================================
echo.

cd /d "%~dp0"

set "PY_CMD=python"
if exist "C:\Users\MATRIX\AppData\Local\Programs\Python\Python312\python.exe" (
    set "PY_CMD=C:\Users\MATRIX\AppData\Local\Programs\Python\Python312\python.exe"
)

echo [INFO] Starting FastAPI on http://127.0.0.1:8000 ...
"%PY_CMD%" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Backend failed to start.
)
pause
