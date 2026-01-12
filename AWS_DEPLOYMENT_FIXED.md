# AWS EC2 Deployment Guide - FIXED VERSION
## For Rishon LeZion Municipal Billing System

## Your Current Setup
- **Domain**: rishon.titans.global  
- **Elastic IP**: 18.192.238.102
- **Issue**: Docker runs locally but fails on AWS due to Dockerfile and environment issues

## Prerequisites on EC2
- Ubuntu 22.04 LTS EC2 instance
- Security Group with ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)
- Your Elastic IP (18.192.238.102) attached to the instance

## Step 1: Connect to EC2
```bash
ssh -i your-key.pem ubuntu@18.192.238.102
```

## Step 2: Install Docker & Docker Compose
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for docker group
exit
# SSH back in
ssh -i your-key.pem ubuntu@18.192.238.102
```

## Step 3: Clone and Setup Repository
```bash
# Clone your repository
git clone https://github.com/RonTitans/RishonLetzionMuni.git
cd RishonLetzionMuni

# Create necessary directories
mkdir -p uploads output logs
```

## Step 4: Upload Fixed Files
Upload these fixed files to your EC2 instance:

1. **Fixed backend/Dockerfile** (already updated in your local repo)
2. **docker-compose.aws.yml** (new simplified version)
3. **nginx/nginx.aws.conf** (new simplified nginx config)
4. **.env.aws** (environment configuration)

You can use SCP to upload:
```bash
# From your local machine
scp -i your-key.pem docker-compose.aws.yml ubuntu@18.192.238.102:~/RishonLetzionMuni/
scp -i your-key.pem nginx/nginx.aws.conf ubuntu@18.192.238.102:~/RishonLetzionMuni/nginx/
scp -i your-key.pem .env.aws ubuntu@18.192.238.102:~/RishonLetzionMuni/
scp -i your-key.pem backend/Dockerfile ubuntu@18.192.238.102:~/RishonLetzionMuni/backend/
```

## Step 5: Configure Environment
```bash
# On EC2
cd ~/RishonLetzionMuni
cp .env.aws .env

# Edit .env to set secure passwords
nano .env
# Change:
# - DB_PASSWORD to something secure
# - JWT_SECRET to something secure
```

## Step 6: Build and Deploy
```bash
# Build all services
docker-compose -f docker-compose.aws.yml build

# If build fails, try with no cache
docker-compose -f docker-compose.aws.yml build --no-cache

# Start all services
docker-compose -f docker-compose.aws.yml up -d

# Check if everything is running
docker ps

# Check logs
docker-compose -f docker-compose.aws.yml logs -f
```

## Step 7: Verify Deployment
1. Open browser to: http://18.192.238.102
2. You should see the login page
3. Default credentials: admin / admin123

## Troubleshooting Common Issues

### Issue 1: npm install fails in Dockerfile
**Solution**: The fixed Dockerfile now properly copies package.json first and uses `npm ci`

### Issue 2: Python packages fail to install
**Solution**: The fixed Dockerfile now copies requirements.txt and uses it properly

### Issue 3: Container can't connect to database
**Solution**: Check that postgres container is healthy:
```bash
docker-compose -f docker-compose.aws.yml ps
docker-compose -f docker-compose.aws.yml logs postgres
```

### Issue 4: Frontend can't reach backend
**Solution**: Verify the VITE_API_URL in .env:
```bash
# Should be your Elastic IP
VITE_API_URL=http://18.192.238.102/api
```

### Issue 5: Permission denied errors
```bash
sudo chown -R ubuntu:ubuntu uploads output logs
```

### Issue 6: Out of disk space
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a
```

## Commands Cheat Sheet

### Start/Stop
```bash
# Start
docker-compose -f docker-compose.aws.yml up -d

# Stop
docker-compose -f docker-compose.aws.yml down

# Restart
docker-compose -f docker-compose.aws.yml restart
```

### Logs
```bash
# All logs
docker-compose -f docker-compose.aws.yml logs -f

# Specific service
docker-compose -f docker-compose.aws.yml logs -f backend
```

### Rebuild
```bash
# Rebuild specific service
docker-compose -f docker-compose.aws.yml build backend

# Rebuild all
docker-compose -f docker-compose.aws.yml build --no-cache
```

### Database
```bash
# Connect to database
docker-compose -f docker-compose.aws.yml exec postgres psql -U rishon_admin -d rishon_billing

# Backup database
docker-compose -f docker-compose.aws.yml exec postgres pg_dump -U rishon_admin rishon_billing > backup.sql
```

## Setting up HTTPS with Let's Encrypt (Optional)

Once everything works on HTTP, you can add HTTPS:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d rishon.titans.global

# Auto-renewal
sudo systemctl enable certbot.timer
```

## Final Notes

1. **Security**: Change all default passwords immediately
2. **Backups**: Set up regular database backups
3. **Monitoring**: Consider adding CloudWatch monitoring
4. **DNS**: Make sure rishon.titans.global points to 18.192.238.102

## Quick Deploy Script

Save this as `quick-deploy.sh` on your EC2:

```bash
#!/bin/bash
cd ~/RishonLetzionMuni
docker-compose -f docker-compose.aws.yml down
git pull
docker-compose -f docker-compose.aws.yml build --no-cache
docker-compose -f docker-compose.aws.yml up -d
docker-compose -f docker-compose.aws.yml logs -f
```

Make it executable: `chmod +x quick-deploy.sh`
Run with: `./quick-deploy.sh`