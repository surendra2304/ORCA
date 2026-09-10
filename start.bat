@echo off
echo ==========================================
echo   ORCA - Oceanic Reasoning & Coastal Advisory System
echo   SIH 2026
echo ==========================================
echo.

REM Start Backend
echo Starting Backend Server...
start "ORCA Backend" cmd /k "cd /d %~dp0 && .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM Wait for backend to start
timeout /t 5 /nobreak >nul

REM Start Frontend
echo Starting Frontend Development Server...
start "ORCA Frontend" cmd /k "cd /d %~dp0\remix-remix-orca-fishermen && npm run dev"

echo.
echo ==========================================
echo   ORCA is running!
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo ==========================================
echo.
echo Press any key to exit...
pause >nul