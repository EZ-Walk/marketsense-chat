#!/bin/bash

# MarketSense Open Claw Setup Script
# This script sets up the Open Claw container integration for MarketSense

set -e

echo "🚀 Setting up MarketSense Open Claw Integration..."

# Color definitions for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
}

# Check prerequisites
print_header "🔍 Checking prerequisites..."

command -v docker >/dev/null 2>&1 || { 
    print_error "Docker is required but not installed. Please install Docker first."
    exit 1
}

command -v docker-compose >/dev/null 2>&1 || { 
    print_error "Docker Compose is required but not installed. Please install Docker Compose first."
    exit 1
}

print_status "Docker and Docker Compose are installed ✓"

# Check if MarketSense network exists, create if not
print_header "🌐 Setting up MarketSense network..."

if ! docker network ls | grep -q marketsense-network; then
    print_status "Creating marketsense-network..."
    docker network create marketsense-network
else
    print_status "marketsense-network already exists ✓"
fi

# Setup environment file
print_header "⚙️ Setting up environment configuration..."

if [ ! -f "./openclaw-integration/.env" ]; then
    print_status "Creating environment file from template..."
    cp ./openclaw-integration/.env.example ./openclaw-integration/.env
    print_warning "Please edit ./openclaw-integration/.env to configure your API keys and settings"
else
    print_status "Environment file already exists ✓"
fi

# Create necessary directories
print_header "📁 Creating necessary directories..."

mkdir -p ./openclaw-integration/logs
mkdir -p ./data/openclaw/config
mkdir -p ./data/openclaw/workspace
mkdir -p ./data/openclaw/memory

print_status "Directories created ✓"

# Install dependencies for integration service
print_header "📦 Installing integration service dependencies..."

cd openclaw-integration
if [ -f "package.json" ]; then
    print_status "Installing Node.js dependencies..."
    npm install
    print_status "Dependencies installed ✓"
else
    print_error "package.json not found in openclaw-integration directory"
    exit 1
fi
cd ..

# Pull Open Claw Docker image
print_header "🐳 Pulling Open Claw Docker image..."

print_status "Pulling latest Open Claw image..."
docker pull ghcr.io/phioranex/openclaw-docker:latest
print_status "Open Claw image pulled ✓"

# Build integration service
print_header "🔨 Building MarketSense Open Claw integration service..."

print_status "Building integration service Docker image..."
docker build -t marketsense-openclaw-integration ./openclaw-integration/
print_status "Integration service built ✓"

# Start services
print_header "🚀 Starting MarketSense Open Claw services..."

print_status "Starting services with Docker Compose..."
docker-compose -f docker-compose.openclaw.yml up -d

print_status "Waiting for services to be healthy..."
sleep 30

# Check service health
print_header "🏥 Checking service health..."

check_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            print_status "$service_name is healthy ✓"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name health check failed"
    return 1
}

echo "Checking Open Claw Gateway..."
if check_service "Open Claw Gateway" "http://localhost:18789/health"; then
    echo ""
else
    print_warning "Open Claw Gateway may still be starting up"
fi

echo "Checking Integration Service..."
if check_service "Integration Service" "http://localhost:4000/health"; then
    echo ""
else
    print_warning "Integration Service may still be starting up"
fi

# Display connection information
print_header "📋 Setup Complete!"

echo ""
echo -e "${GREEN}MarketSense Open Claw Integration Setup Complete!${NC}"
echo ""
echo "🔗 Service URLs:"
echo "  • Open Claw Gateway:     http://localhost:18789"
echo "  • Integration Service:   http://localhost:4000"
echo "  • Redis Admin:           http://localhost:6380"
echo ""
echo "📁 Important Directories:"
echo "  • Config:      ./data/openclaw/config"
echo "  • Workspace:   ./data/openclaw/workspace"
echo "  • Logs:        ./openclaw-integration/logs"
echo ""
echo "⚙️ Configuration:"
echo "  • Edit environment:      ./openclaw-integration/.env"
echo "  • View services:         docker-compose -f docker-compose.openclaw.yml ps"
echo "  • View logs:            docker-compose -f docker-compose.openclaw.yml logs -f"
echo ""
echo "🛑 To stop services:"
echo "  docker-compose -f docker-compose.openclaw.yml down"
echo ""

print_warning "Don't forget to configure your AI provider API keys in ./openclaw-integration/.env"

echo "🎉 Open Claw is now integrated with your MarketSense project!"