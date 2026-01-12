#!/bin/bash

echo "=== AWS Docker Troubleshooting Script ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Docker status
echo -e "${YELLOW}1. Docker Status:${NC}"
sudo systemctl status docker --no-pager | head -10
echo ""

# Check Docker Compose version
echo -e "${YELLOW}2. Docker Compose Version:${NC}"
docker-compose --version
echo ""

# Check running containers
echo -e "${YELLOW}3. Running Containers:${NC}"
docker ps
echo ""

# Check all containers (including stopped)
echo -e "${YELLOW}4. All Containers:${NC}"
docker ps -a
echo ""

# Check Docker networks
echo -e "${YELLOW}5. Docker Networks:${NC}"
docker network ls
echo ""

# Check disk space
echo -e "${YELLOW}6. Disk Space:${NC}"
df -h
echo ""

# Check memory
echo -e "${YELLOW}7. Memory Usage:${NC}"
free -h
echo ""

# Check environment file
echo -e "${YELLOW}8. Environment File:${NC}"
if [ -f .env ]; then
    echo ".env file exists"
    echo "Variables (without passwords):"
    grep -v PASSWORD .env | grep -v SECRET | head -5
else
    echo -e "${RED}.env file not found!${NC}"
fi
echo ""

# Check logs for each service
echo -e "${YELLOW}9. Service Logs:${NC}"
for service in postgres backend frontend nginx; do
    echo -e "${GREEN}--- $service logs (last 10 lines) ---${NC}"
    docker-compose -f docker-compose.aws.yml logs --tail=10 $service 2>/dev/null || echo "Service $service not found or not running"
    echo ""
done

# Check port usage
echo -e "${YELLOW}10. Port Usage:${NC}"
sudo netstat -tlnp | grep -E ':(80|443|5000|5432|3000)\s'
echo ""

# Docker build errors
echo -e "${YELLOW}11. Build Issues:${NC}"
echo "To rebuild a specific service:"
echo "  docker-compose -f docker-compose.aws.yml build --no-cache [service_name]"
echo ""
echo "To see detailed build output:"
echo "  docker-compose -f docker-compose.aws.yml build --progress=plain"
echo ""

# Common fixes
echo -e "${YELLOW}12. Common Fixes:${NC}"
echo "a) Clear Docker cache:"
echo "   docker system prune -a"
echo ""
echo "b) Restart Docker:"
echo "   sudo systemctl restart docker"
echo ""
echo "c) Fix permissions:"
echo "   sudo chown -R ubuntu:ubuntu uploads output logs"
echo ""
echo "d) Rebuild everything:"
echo "   docker-compose -f docker-compose.aws.yml down"
echo "   docker-compose -f docker-compose.aws.yml build --no-cache"
echo "   docker-compose -f docker-compose.aws.yml up -d"
echo ""