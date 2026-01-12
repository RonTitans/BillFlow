#!/bin/bash

echo "=== AWS Deployment Script for Rishon LeZion Municipal System ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on EC2
if [ ! -f /home/ubuntu/.ssh/authorized_keys ]; then
    echo -e "${YELLOW}Warning: This script is designed to run on Ubuntu EC2 instance${NC}"
    echo "Continue anyway? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 1: Install Docker if not present
echo -e "${GREEN}Step 1: Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt update
    sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    sudo apt update
    sudo apt install -y docker-ce
    sudo usermod -aG docker $USER
    echo -e "${YELLOW}Docker installed. Please logout and login again, then run this script again.${NC}"
    exit 0
fi

# Step 2: Install Docker Compose if not present
echo -e "${GREEN}Step 2: Checking Docker Compose installation...${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Step 3: Create necessary directories
echo -e "${GREEN}Step 3: Creating directories...${NC}"
mkdir -p uploads output logs

# Step 4: Copy environment file
echo -e "${GREEN}Step 4: Setting up environment...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.aws ]; then
        cp .env.aws .env
        echo "Created .env from .env.aws"
    else
        echo -e "${RED}Error: .env.aws not found. Please create it first.${NC}"
        exit 1
    fi
fi

# Step 5: Stop existing containers
echo -e "${GREEN}Step 5: Stopping existing containers...${NC}"
docker-compose -f docker-compose.aws.yml down 2>/dev/null || true

# Step 6: Build images
echo -e "${GREEN}Step 6: Building Docker images...${NC}"
docker-compose -f docker-compose.aws.yml build --no-cache

# Step 7: Start services
echo -e "${GREEN}Step 7: Starting services...${NC}"
docker-compose -f docker-compose.aws.yml up -d

# Step 8: Wait for services to be ready
echo -e "${GREEN}Step 8: Waiting for services to start...${NC}"
sleep 10

# Step 9: Check service status
echo -e "${GREEN}Step 9: Checking service status...${NC}"
docker-compose -f docker-compose.aws.yml ps

# Step 10: Show logs
echo -e "${GREEN}Step 10: Recent logs:${NC}"
docker-compose -f docker-compose.aws.yml logs --tail=20

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Access your application at:"
echo "  - http://18.192.238.102 (via Elastic IP)"
echo "  - http://rishon.titans.global (once DNS is configured)"
echo ""
echo "Default credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "Useful commands:"
echo "  View logs: docker-compose -f docker-compose.aws.yml logs -f"
echo "  Restart: docker-compose -f docker-compose.aws.yml restart"
echo "  Stop: docker-compose -f docker-compose.aws.yml down"
echo ""