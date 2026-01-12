@echo off
echo ====================================
echo   Rishon LeZion Billing System
echo   Starting Local Development
echo ====================================
echo.

echo Checking Docker Desktop...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop.
    pause
    exit /b 1
)

echo Docker is running.
echo.

echo Building and starting services...
docker-compose up --build -d

if %errorlevel% equ 0 (
    echo.
    echo ====================================
    echo   Services Started Successfully!
    echo ====================================
    echo.
    echo Frontend: http://localhost:3000
    echo Backend:  http://localhost:5000/health
    echo Database: localhost:5432
    echo.
    echo Default Login:
    echo Username: admin
    echo Password: admin123
    echo.
    echo To view logs: docker-compose logs -f
    echo To stop: docker-compose down
    echo.
) else (
    echo.
    echo ERROR: Failed to start services.
    echo Check the error messages above.
    echo.
)

pause