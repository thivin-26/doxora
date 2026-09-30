@echo off
echo ===================================================
echo Starting Doxora (Backend + Frontend)
echo ===================================================

echo Starting Flask Backend...
start "Doxora Backend (Flask)" cmd /k "cd /d "%~dp0documind-backend\documind" && (if exist .venv\Scripts\activate.bat call .venv\Scripts\activate.bat) && python app.py"

echo Starting Vite Frontend...
start "Doxora Frontend (Vite)" cmd /k "cd /d "%~dp0documind-frontend\documind-frontend" && npm run dev"

echo.
echo Both servers are starting!
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
