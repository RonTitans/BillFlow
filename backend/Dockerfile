# Backend Dockerfile
FROM node:18-slim

# Install Python and required packages for file processing
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY requirements.txt ./

# Install Node dependencies
RUN npm ci --only=production

# Install Python dependencies
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads output logs

# Expose port
EXPOSE 5000

# Run the application
CMD ["node", "server-billflow.js"]