#!/bin/bash

# XMAS Event System - Vultr Deployment Script
# This script automates the deployment process on a fresh Vultr server

set -e  # Exit on error

echo "================================================"
echo "XMAS Event System - Vultr Deployment"
echo "================================================"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# Update system
print_info "Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install required packages
print_info "Installing required packages..."
apt-get install -y \
    curl \
    git \
    vim \
    htop \
    ufw \
    certbot \
    python3-certbot-nginx

# Install Docker
print_info "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
else
    print_warning "Docker is already installed"
fi

# Install Docker Compose
print_info "Installing Docker Compose..."
# Check for docker compose plugin (v2)
if docker compose version &> /dev/null; then
    print_warning "Docker Compose (v2) is already installed via plugin"
elif ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_VERSION="2.24.0"
    curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    print_warning "Docker Compose (v1) is already installed"
fi

# Configure firewall
print_info "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw status

# Create application directory
APP_DIR="/opt/xmas-event"
print_info "Creating application directory at ${APP_DIR}..."
mkdir -p ${APP_DIR}
cd ${APP_DIR}

# Clone repository (update with your actual repo)
print_info "Checking for existing code..."
if [ "$(ls -A $APP_DIR)" ]; then
    print_warning "Directory $APP_DIR is not empty. Skipping git clone."
else
    print_info "Cloning repository..."
    read -p "Enter your Git repository URL (leave empty to skip): " GIT_REPO
    if [ ! -z "$GIT_REPO" ]; then
        git clone ${GIT_REPO} .
    else
        print_warning "Skipping git clone. Please manually copy your code to ${APP_DIR}"
    fi
fi

# Setup environment file
print_info "Setting up environment configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    print_warning "Please edit .env file with your configuration:"
    print_warning "  - DATABASE credentials"
    print_warning "  - JWT_SECRET (use a strong random string)"
    print_warning "  - CORS_ORIGINS (your domain)"
    print_warning ""
    read -p "Press Enter to edit .env file now (or Ctrl+C to skip)..."
    vim .env
fi

# Generate JWT secret if not set
if grep -q "your-super-secret-jwt-key" .env; then
    JWT_SECRET=$(openssl rand -hex 32)
    sed -i "s|your-super-secret-jwt-key.*|${JWT_SECRET}|g" .env
    print_info "Generated random JWT_SECRET"
fi

# Setup SSL certificate
print_info "Setting up SSL certificate..."
read -p "Enter your domain name (e.g., example.com): " DOMAIN
read -p "Enter your email for Let's Encrypt: " EMAIL

if [ ! -z "$DOMAIN" ] && [ ! -z "$EMAIL" ]; then
    # Update nginx config with domain
    sed -i "s|yourdomain.com|${DOMAIN}|g" nginx/nginx.conf
    
    # Get SSL certificate
    print_info "Obtaining SSL certificate from Let's Encrypt..."
    mkdir -p nginx/ssl
    certbot certonly --standalone \
        --preferred-challenges http \
        --email ${EMAIL} \
        --agree-tos \
        --no-eff-email \
        -d ${DOMAIN} \
        -d www.${DOMAIN}
    
    # Link certificates
    ln -sf /etc/letsencrypt/live/${DOMAIN}/fullchain.pem nginx/ssl/fullchain.pem
    ln -sf /etc/letsencrypt/live/${DOMAIN}/privkey.pem nginx/ssl/privkey.pem
    
    # Setup auto-renewal
    echo "0 0,12 * * * root python3 -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew -q" | tee -a /etc/crontab > /dev/null
else
    print_warning "Skipping SSL setup. You'll need to configure it manually."
fi

# Build and start containers
print_info "Building and starting Docker containers..."
docker-compose build
docker-compose up -d

# Wait for database to be ready
print_info "Waiting for database to be ready..."
sleep 10

# Run database migrations
print_info "Running database migrations..."
docker-compose exec -T backend alembic upgrade head || print_warning "Migration failed - you may need to run it manually"

# Create initial admin user (optional)
print_info "Creating initial data..."
# Add your seed script here if needed
# docker-compose exec -T backend python scripts/seed_data.py

# Check service status
print_info "Checking service status..."
docker-compose ps

# Print access information
echo ""
echo "================================================"
echo "Deployment completed!"
echo "================================================"
echo ""
print_info "Services are running:"
echo "  - Frontend: https://${DOMAIN:-your-domain.com}"
echo "  - Backend API: https://${DOMAIN:-your-domain.com}/api"
echo "  - Admin API: https://${DOMAIN:-your-domain.com}/admin/api"
echo ""
print_info "To view logs:"
echo "  docker-compose logs -f"
echo ""
print_info "To restart services:"
echo "  docker-compose restart"
echo ""
print_info "To stop services:"
echo "  docker-compose down"
echo ""
print_warning "IMPORTANT: Review and update the following:"
echo "  1. Database credentials in .env"
echo "  2. JWT_SECRET in .env (currently auto-generated)"
echo "  3. CORS_ORIGINS in .env"
echo "  4. Run database seeds if needed"
echo ""
print_info "For monitoring, check:"
echo "  - Application logs: ${APP_DIR}/logs"
echo "  - Nginx logs: ${APP_DIR}/logs/nginx"
echo "  - Docker logs: docker-compose logs"
echo ""
echo "================================================"
