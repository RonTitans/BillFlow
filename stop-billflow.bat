@echo off
echo ============================================
echo   BillFlow - Stopping Services
echo ============================================
echo.

cd /d "%~dp0"

docker-compose -f docker-compose.billflow.yml down

echo.
echo BillFlow services stopped.
pause
