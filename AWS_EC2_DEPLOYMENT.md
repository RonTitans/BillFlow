# AWS EC2 Deployment Guide

## Prerequisites
- AWS account with EC2 access
- Domain name (titans.global) configured in Route 53
- SSH key pair for EC2 access

## Step 1: Launch EC2 Instance

1. **Go to EC2 Dashboard**
   - Region: Choose closest to your users (e.g., eu-west-1)

2. **Launch Instance**
   - **Name**: RishonLetzion-Billing
   - **AMI**: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type
   - **Instance Type**: t3.medium (2 vCPU, 4 GB RAM)
   - **Key Pair**: Create new or use existing
   - **Network Settings**:
     - Create security group
     - Allow SSH (22) from your IP
     - Allow HTTP (80) from anywhere
     - Allow HTTPS (443) from anywhere
   - **Storage**: 20 GB gp3

3. **Security Group Rules**
   ```
   Type        Protocol  Port Range  Source
   SSH         TCP       22          Your IP
   HTTP        TCP       80          0.0.0.0/0
   HTTPS       TCP       443         0.0.0.0/0
   Custom TCP  TCP       5000        0.0.0.0/0 (for testing)
   PostgreSQL  TCP       5432        Security Group ID (self-reference)
   ```

## Step 2: Connect to Instance

```bash
# Connect via SSH
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Update system
sudo apt update && sudo apt upgrade -y
```

## Step 3: Install Docker and Docker Compose

```bash
# Install Docker
sudo apt install apt-transport-https ca-certificates curl software-properties-common -y
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt update
sudo apt install docker-ce -y

# Add user to docker group
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Logout and login again for group changes
exit
# SSH back in
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

## Step 4: Clone Repository

```bash
# Clone the repository
git clone https://github.com/RonTitans/RishonLetzionMuni.git
cd RishonLetzionMuni

# Create directories for persistent data
mkdir -p uploads output logs certbot/www certbot/conf
```

## Step 5: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit environment variables
nano .env
```

Update the `.env` file with production values:
```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=rishon_billing
DB_USER=rishon_admin
DB_PASSWORD=GenerateSecurePasswordHere123!

# Backend
PORT=5000
JWT_SECRET=GenerateSecureJWTSecretHere456!
NODE_ENV=production

# Frontend
VITE_API_URL=https://rishon.titans.global/api
FRONTEND_URL=https://rishon.titans.global

# Domain
DOMAIN=rishon.titans.global
SSL_EMAIL=admin@titans.global
```

## Step 6: Configure DNS

1. **In AWS Route 53**:
   - Go to Hosted Zones
   - Select titans.global
   - Create Record:
     - Name: rishon
     - Type: A
     - Value: Your EC2 Elastic IP
     - TTL: 300

2. **Allocate Elastic IP** (recommended):
   ```bash
   # In AWS Console: EC2 > Elastic IPs > Allocate
   # Then associate with your instance
   ```

## Step 7: Initial SSL Certificate Setup

```bash
# First, start nginx without SSL to get initial certificate
docker-compose -f docker-compose.prod.yml up -d nginx

# Get SSL certificate
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot --webroot-path /var/www/certbot \
  --email admin@titans.global \
  --agree-tos \
  --no-eff-email \
  -d rishon.titans.global

# Stop nginx
docker-compose -f docker-compose.prod.yml down
```

## Step 8: Deploy Application

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Verify all containers are running
docker ps
```

## Step 9: Initialize Database

```bash
# The database will be automatically initialized on first run
# Check if admin user was created
docker-compose -f docker-compose.prod.yml logs backend | grep "admin user"

# If needed, connect to database
docker-compose -f docker-compose.prod.yml exec postgres psql -U rishon_admin -d rishon_billing
```

## Step 10: Test Deployment

1. **Test HTTPS access**:
   - Open https://rishon.titans.global
   - Should see login page

2. **Test login**:
   - Username: admin
   - Password: admin123

3. **Test file upload**:
   - Upload a sample CSV
   - Process it
   - Download results

## Step 11: Setup Automatic SSL Renewal

```bash
# Create renewal script
cat > /home/ubuntu/renew-ssl.sh << 'EOF'
#!/bin/bash
cd /home/ubuntu/RishonLetzionMuni
docker-compose -f docker-compose.prod.yml run --rm certbot renew
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
EOF

chmod +x /home/ubuntu/renew-ssl.sh

# Add to crontab
crontab -e
# Add this line:
0 0 * * * /home/ubuntu/renew-ssl.sh >> /home/ubuntu/ssl-renew.log 2>&1
```

## Step 12: Setup Monitoring

```bash
# Install monitoring tools
sudo apt install htop ncdu -y

# Create backup script
cat > /home/ubuntu/backup-data.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cd /home/ubuntu/RishonLetzionMuni
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U rishon_admin rishon_billing > backup_$DATE.sql
tar -czf uploads_backup_$DATE.tar.gz uploads/
tar -czf output_backup_$DATE.tar.gz output/
# Upload to S3 if configured
# aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
EOF

chmod +x /home/ubuntu/backup-data.sh

# Schedule daily backups
crontab -e
# Add:
0 2 * * * /home/ubuntu/backup-data.sh >> /home/ubuntu/backup.log 2>&1
```

## Maintenance Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f [service_name]

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Update application
git pull
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Check disk usage
df -h
du -sh *

# Database backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U rishon_admin rishon_billing > backup.sql

# Database restore
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U rishon_admin rishon_billing < backup.sql
```

## Troubleshooting

### Container won't start
```bash
docker-compose -f docker-compose.prod.yml logs [service_name]
docker-compose -f docker-compose.prod.yml ps
```

### SSL issues
```bash
# Check certificate
docker-compose -f docker-compose.prod.yml exec nginx ls -la /etc/letsencrypt/live/
# Renew manually
docker-compose -f docker-compose.prod.yml run --rm certbot renew --force-renewal
```

### Database connection issues
```bash
# Check if postgres is running
docker-compose -f docker-compose.prod.yml ps postgres
# Check logs
docker-compose -f docker-compose.prod.yml logs postgres
# Test connection
docker-compose -f docker-compose.prod.yml exec postgres pg_isready
```

### Disk full
```bash
# Clean Docker
docker system prune -a
# Check large files
du -h --max-depth=1 /
# Clean old backups
rm -f backup_*.sql uploads_backup_*.tar.gz output_backup_*.tar.gz
```

## Security Checklist

- [ ] Change default admin password immediately after first login
- [ ] Update .env with strong passwords
- [ ] Restrict SSH access to specific IPs
- [ ] Enable AWS CloudWatch monitoring
- [ ] Configure AWS backup for EBS volumes
- [ ] Set up AWS WAF if needed
- [ ] Enable VPC flow logs
- [ ] Configure CloudTrail for audit logging
- [ ] Set up SNS alerts for critical events

## Support

For issues or questions:
1. Check application logs: `docker-compose -f docker-compose.prod.yml logs`
2. Check system logs: `sudo journalctl -xe`
3. Contact development team with error details