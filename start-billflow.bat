@echo off
echo ============================================
echo   BillFlow - Starting Services
echo ============================================
echo.

cd /d "%~dp0"

echo Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running. Please start Docker Desktop.
    pause
    exit /b 1
)

echo Starting BillFlow cluster...
docker-compose -f docker-compose.billflow.yml up -d --build

echo.
echo ============================================
echo   BillFlow Services Started!
echo ============================================
echo.
echo   Frontend: http://localhost:3001
echo   Backend:  http://localhost:5001
echo   Database: localhost:5433
echo.
echo   Login: admin / admin123
echo.
echo ============================================
pause
