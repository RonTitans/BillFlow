#!/bin/bash
# BillFlow AWS ECS Deployment Script
# Usage: ./deploy.sh [environment]

set -e

# Configuration
AWS_REGION="${AWS_REGION:-il-central-1}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
CLUSTER_NAME="billflow-cluster"
SERVICE_NAME="billflow-service"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "============================================"
echo "  BillFlow AWS ECS Deployment"
echo "============================================"
echo "Region: $AWS_REGION"
echo "Registry: $ECR_REGISTRY"
echo "Tag: $IMAGE_TAG"
echo "============================================"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed"
    exit 1
fi

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# Build and push backend
echo "Building backend..."
docker build -t billflow-backend:$IMAGE_TAG -f backend/Dockerfile.billflow backend/

echo "Tagging and pushing backend..."
docker tag billflow-backend:$IMAGE_TAG $ECR_REGISTRY/billflow-backend:$IMAGE_TAG
docker push $ECR_REGISTRY/billflow-backend:$IMAGE_TAG

# Build and push frontend
echo "Building frontend..."
docker build -t billflow-frontend:$IMAGE_TAG \
  --build-arg VITE_API_URL=https://your-domain.com \
  -f frontend/Dockerfile.billflow frontend/

echo "Tagging and pushing frontend..."
docker tag billflow-frontend:$IMAGE_TAG $ECR_REGISTRY/billflow-frontend:$IMAGE_TAG
docker push $ECR_REGISTRY/billflow-frontend:$IMAGE_TAG

# Update ECS service
echo "Updating ECS service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --force-new-deployment \
  --region $AWS_REGION

echo "============================================"
echo "  Deployment initiated!"
echo "============================================"
echo "Monitor deployment:"
echo "  aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION"
echo ""
echo "View logs:"
echo "  aws logs tail /ecs/billflow --follow --region $AWS_REGION"
echo "============================================"
