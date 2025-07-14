#!/bin/bash

# Quantum Computing Application Deployment Script
# Usage: ./deploy.sh [local|remote] [subdirectory_name]
# 
# Examples:
#   ./deploy.sh local                    # Deploy locally at http://localhost:8086/
#   ./deploy.sh local quantum           # Deploy locally at http://localhost:8086/quantum/
#   ./deploy.sh remote                  # Deploy remotely at your domain root
#   ./deploy.sh remote quantum          # Deploy remotely at your domain/quantum/

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse arguments
ENVIRONMENT=${1:-local}
SUBDIRECTORY=${2:-}

# Validate environment
if [[ "$ENVIRONMENT" != "local" && "$ENVIRONMENT" != "remote" ]]; then
    log_error "Invalid environment. Use 'local' or 'remote'"
    exit 1
fi

# Set default subdirectory if not provided
if [[ -z "$SUBDIRECTORY" ]]; then
    if [[ "$ENVIRONMENT" == "local" ]]; then
        SUBDIRECTORY=""
        log_info "No subdirectory specified, using root for local deployment."
    else
        SUBDIRECTORY="quantum"
        log_info "No subdirectory specified, using default: $SUBDIRECTORY"
    fi
fi

log_info "Starting deployment of Quantum Computing Application"
log_info "Environment: $ENVIRONMENT"
log_info "Subdirectory: $SUBDIRECTORY"

# Navigate to terraform directory
cd "$(dirname "$0")"

# Check if required files exist
if [[ ! -f "terraform.tfvars" ]]; then
    log_error "terraform.tfvars not found. Please create it with your configuration."
    exit 1
fi

if [[ "$ENVIRONMENT" == "remote" ]]; then
    if [[ ! -f "droplet_key" ]]; then
        log_error "droplet_key not found. Please add your SSH private key."
        exit 1
    fi
    chmod 600 droplet_key
fi

# Clean up any previous deployment
log_info "Cleaning up previous deployment..."
terraform destroy -auto-approve 2>/dev/null || true

# Remove terraform state and cache for clean start
log_info "Cleaning terraform state..."
rm -rf .terraform.lock.hcl .terraform/ terraform.tfstate* 2>/dev/null || true

# Re-initialize terraform
log_info "Initializing Terraform..."
terraform init

# Set build platform based on environment
if [[ "$ENVIRONMENT" == "local" ]]; then
    # Detect local architecture
    if [[ $(uname -m) == "arm64" ]] || [[ $(uname -m) == "aarch64" ]]; then
        BUILD_PLATFORM="linux/arm64"
    else
        BUILD_PLATFORM="linux/amd64"
    fi
else
    # Remote is typically amd64
    BUILD_PLATFORM="linux/amd64"
fi

log_info "Using build platform: $BUILD_PLATFORM"

# Set deployment variables
VITE_BASE="/${SUBDIRECTORY}/"
VITE_BASENAME="/${SUBDIRECTORY}"

# Handle root deployment (no subdirectory)
if [[ "$SUBDIRECTORY" == "" || "$SUBDIRECTORY" == "root" ]]; then
    VITE_BASE="/"
    VITE_BASENAME="/"
    SUBDIRECTORY=""
fi

# Apply terraform configuration
log_info "Deploying application..."

terraform apply -auto-approve \
    -var="environment=$ENVIRONMENT" \
    -var="build_platform=$BUILD_PLATFORM" \
    -var="subdirectory_name=$SUBDIRECTORY" \
    -var="vite_base=$VITE_BASE" \
    -var="vite_basename=$VITE_BASENAME"

# Check deployment status
if [[ $? -eq 0 ]]; then
    log_success "Deployment completed successfully!"
    
    echo ""
    echo "=========================="
    echo "DEPLOYMENT INFORMATION"
    echo "=========================="
    
    # Show terraform outputs
    terraform output
    
    echo ""
    echo "=========================="
    echo "ACCESS POINTS"
    echo "=========================="
    
    if [[ "$ENVIRONMENT" == "local" ]]; then
        if [[ -n "$SUBDIRECTORY" ]]; then
            echo "Frontend: http://localhost:8086/${SUBDIRECTORY}/"
        else
            echo "Frontend: http://localhost:8086/"
        fi
        echo "Backend API: http://localhost:8087/"
        echo "API Documentation: http://localhost:8087/docs"
        echo "API Health: http://localhost:8087/health"
    else
        # Get domain from terraform.tfvars
        DOMAIN=$(grep "remote_domain" terraform.tfvars | cut -d'"' -f2)
        if [[ -n "$SUBDIRECTORY" ]]; then
            echo "Frontend: https://${DOMAIN}/${SUBDIRECTORY}/"
            echo "Backend API: https://${DOMAIN}/${SUBDIRECTORY}-api/"
        else
            echo "Frontend: https://${DOMAIN}/"
            echo "Backend API: https://${DOMAIN}/api/"
        fi
        echo "API Documentation: Backend URL + /docs"
        echo "API Health: Backend URL + /health"
    fi
    
    echo ""
    echo "=========================="
    echo "USEFUL COMMANDS"
    echo "=========================="
    echo "Check status:     docker ps"
    echo "View logs:        docker logs quantum-frontend && docker logs quantum-backend"
    echo "Stop deployment:  terraform destroy -auto-approve"
    
    if [[ "$ENVIRONMENT" == "remote" ]]; then
        DROPLET_IP=$(grep "droplet_ip" terraform.tfvars | cut -d'"' -f2)
        echo "Remote status:    ssh root@${DROPLET_IP} 'docker ps'"
        echo "Remote logs:      ssh root@${DROPLET_IP} 'docker logs quantum-frontend'"
    fi
    
    echo ""
    log_success "Quantum Computing Application is now running!"
    
else
    log_error "Deployment failed!"
    exit 1
fi 