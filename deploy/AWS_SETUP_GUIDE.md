# BillFlow AWS ECS Deployment Guide

## Prerequisites
- AWS Account
- AWS CLI installed and configured
- Docker installed
- Domain name (optional, can use ALB DNS)

## Step 1: Create ECR Repositories

```bash
# Set your AWS region
export AWS_REGION=il-central-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create repositories
aws ecr create-repository --repository-name billflow-backend --region $AWS_REGION
aws ecr create-repository --repository-name billflow-frontend --region $AWS_REGION
```

## Step 2: Create RDS PostgreSQL Database

1. Go to AWS Console → RDS → Create Database
2. Select **PostgreSQL** (version 15)
3. Choose **Free tier** or **Production** based on needs
4. Settings:
   - DB instance identifier: `billflow-db`
   - Master username: `billflow_admin`
   - Master password: (generate strong password)
5. Connectivity:
   - VPC: Select your VPC
   - Public access: No
   - Security group: Create new (allow port 5432 from ECS)
6. Database name: `billflow_db`

Save these details for Secrets Manager.

## Step 3: Store Secrets in AWS Secrets Manager

```bash
# Create database secrets
aws secretsmanager create-secret \
  --name billflow/db \
  --secret-string '{
    "host": "your-rds-endpoint.region.rds.amazonaws.com",
    "username": "billflow_admin",
    "password": "YOUR_STRONG_PASSWORD",
    "dbname": "billflow_db",
    "port": "5432"
  }' \
  --region $AWS_REGION

# Create JWT secret
aws secretsmanager create-secret \
  --name billflow/jwt \
  --secret-string '{"secret": "your-super-secret-jwt-key-at-least-32-chars"}' \
  --region $AWS_REGION
```

## Step 4: Create EFS for File Storage

```bash
# Create EFS file system
aws efs create-file-system \
  --performance-mode generalPurpose \
  --throughput-mode bursting \
  --encrypted \
  --tags Key=Name,Value=billflow-efs \
  --region $AWS_REGION
```

Note the FileSystemId (fs-XXXXXXXX) for the task definition.

## Step 5: Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name billflow-cluster \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
  --region $AWS_REGION
```

## Step 6: Create IAM Roles

### Task Execution Role
```bash
# Create execution role (for pulling images, logging)
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach policies
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
```

## Step 7: Create Application Load Balancer (ALB)

1. Go to EC2 → Load Balancers → Create
2. Select **Application Load Balancer**
3. Configuration:
   - Name: `billflow-alb`
   - Scheme: Internet-facing
   - IP type: IPv4
4. Network:
   - VPC: Your VPC
   - Subnets: Select at least 2 public subnets
5. Security Group:
   - Allow HTTP (80) and HTTPS (443) from 0.0.0.0/0
6. Listeners:
   - HTTP:80 → Redirect to HTTPS:443
   - HTTPS:443 → Forward to target group

## Step 8: Request SSL Certificate (Free with ACM)

1. Go to AWS Certificate Manager
2. Request a public certificate
3. Enter your domain: `billflow.yourdomain.com`
4. Validation method: DNS validation
5. Add the CNAME record to your DNS provider
6. Wait for validation (usually 5-30 minutes)

## Step 9: Configure DNS (Route 53 or External)

### Option A: Route 53
```bash
# Create A record alias pointing to ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "billflow.yourdomain.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "ALB_HOSTED_ZONE_ID",
          "DNSName": "billflow-alb-xxxxx.region.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

### Option B: External DNS Provider
Add a CNAME record:
- Name: `billflow`
- Value: `billflow-alb-xxxxx.region.elb.amazonaws.com`

## Step 10: Build and Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push backend
cd backend
docker build -t billflow-backend -f Dockerfile.billflow .
docker tag billflow-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/billflow-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/billflow-backend:latest

# Build and push frontend
cd ../frontend
docker build -t billflow-frontend \
  --build-arg VITE_API_URL=https://billflow.yourdomain.com \
  -f Dockerfile.billflow .
docker tag billflow-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/billflow-frontend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/billflow-frontend:latest
```

## Step 11: Register Task Definition

Update `ecs-task-definition.json`:
- Replace `ACCOUNT_ID` with your AWS account ID
- Replace `fs-XXXXXXXX` with your EFS ID

```bash
aws ecs register-task-definition \
  --cli-input-json file://deploy/ecs-task-definition.json \
  --region $AWS_REGION
```

## Step 12: Create ECS Service

```bash
aws ecs create-service \
  --cluster billflow-cluster \
  --service-name billflow-service \
  --task-definition billflow \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration '{
    "awsvpcConfiguration": {
      "subnets": ["subnet-xxx", "subnet-yyy"],
      "securityGroups": ["sg-xxx"],
      "assignPublicIp": "ENABLED"
    }
  }' \
  --load-balancers '[{
    "targetGroupArn": "arn:aws:elasticloadbalancing:region:account:targetgroup/billflow-tg/xxx",
    "containerName": "billflow-frontend",
    "containerPort": 80
  }]' \
  --region $AWS_REGION
```

## Step 13: Initialize Database

Connect to RDS and run the init script:

```bash
# Using psql from EC2 bastion or local with VPN
psql -h your-rds-endpoint.region.rds.amazonaws.com \
     -U billflow_admin \
     -d billflow_db \
     -f database/init.sql
```

## Monitoring & Logs

### View Logs
```bash
aws logs tail /ecs/billflow --follow --region $AWS_REGION
```

### Check Service Status
```bash
aws ecs describe-services \
  --cluster billflow-cluster \
  --services billflow-service \
  --region $AWS_REGION
```

## Cost Estimate (Monthly)

| Service | Estimated Cost |
|---------|---------------|
| ECS Fargate (1 vCPU, 2GB) | ~$30-40 |
| RDS PostgreSQL (db.t3.micro) | ~$15-20 |
| ALB | ~$16-20 |
| EFS (10GB) | ~$3 |
| Data Transfer | ~$5-10 |
| **Total** | **~$70-100/month** |

## Quick Start (After Setup)

```bash
# Deploy new version
./deploy/deploy.sh

# Rollback
aws ecs update-service \
  --cluster billflow-cluster \
  --service billflow-service \
  --task-definition billflow:PREVIOUS_VERSION \
  --region $AWS_REGION
```

## Security Checklist

- [ ] RDS not publicly accessible
- [ ] Secrets in Secrets Manager (not environment variables)
- [ ] Security groups properly configured
- [ ] SSL certificate active
- [ ] HTTPS redirect enabled
- [ ] IAM roles follow least privilege
- [ ] CloudWatch alarms configured
- [ ] Regular backups enabled for RDS
