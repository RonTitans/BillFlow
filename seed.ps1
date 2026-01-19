# BillFlow Seed Script (PowerShell)
# Seeds the database with sample billing data from seed-data folder
#
# Usage:
#   .\seed.ps1         - Run seed in existing container
#   .\seed.ps1 fresh   - Rebuild and seed with fresh database

param(
    [switch]$fresh
)

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  BillFlow Database Seeder" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Check if we want a fresh database
if ($fresh) {
    Write-Host "Stopping containers and removing volumes..." -ForegroundColor Yellow
    docker-compose -f docker-compose.billflow.yml down -v
    Write-Host "Starting fresh containers..." -ForegroundColor Yellow
    docker-compose -f docker-compose.billflow.yml up -d --build
    Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
}

# Check if containers are running
$backendRunning = docker ps --filter "name=billflow-backend" --format "{{.Names}}"
if (-not $backendRunning) {
    Write-Host "Starting containers..." -ForegroundColor Yellow
    docker-compose -f docker-compose.billflow.yml up -d
    Write-Host "Waiting for services to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
}

Write-Host ""
Write-Host "Running seed script..." -ForegroundColor Green
docker exec billflow-backend node seed.js

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  Seeding Complete!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Access the app at: http://localhost:3001" -ForegroundColor White
Write-Host "Login: admin / admin123" -ForegroundColor White
