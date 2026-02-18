#!/bin/bash

# Deployment script for Vendor Booking System
# This script handles both development and production deployments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if environment is provided
ENVIRONMENT=${1:-development}
BACKEND_URL=${2:-http://localhost:3001}

print_status "Starting deployment for environment: $ENVIRONMENT"
print_status "Backend URL: $BACKEND_URL"

# Validate environment
if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "production" ]]; then
    print_error "Invalid environment. Use 'development' or 'production'"
    exit 1
fi

# Navigate to frontend directory
cd "$(dirname "$0")/.."

# Install dependencies
print_status "Installing dependencies..."
npm install

# Set environment variables
if [[ "$ENVIRONMENT" == "development" ]]; then
    print_status "Setting up development environment..."
    export NEXT_PUBLIC_API_URL=$BACKEND_URL
    export NEXT_PUBLIC_ENV=development
    export NEXT_PUBLIC_APP_NAME="Vendor Booking System (Dev)"
    export NEXT_PUBLIC_APP_VERSION="1.0.0-dev"
else
    print_status "Setting up production environment..."
    export NEXT_PUBLIC_API_URL=$BACKEND_URL
    export NEXT_PUBLIC_ENV=production
    export NEXT_PUBLIC_APP_NAME="Vendor Booking System"
    export NEXT_PUBLIC_APP_VERSION="1.0.0"
fi

# Build the application
print_status "Building application..."
npm run build

if [[ "$ENVIRONMENT" == "production" ]]; then
    print_status "Deploying to Vercel..."
    vercel --prod
    print_success "Production deployment completed!"
else
    print_status "Starting development server..."
    npm run dev
fi

print_success "Process completed!"
