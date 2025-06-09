# Quantum Computing Application Deployment Guide

This is a comprehensive, reusable deployment setup for full-stack applications using Docker and Terraform. Originally created for a quantum computing educational application, this setup can be easily adapted for any React frontend + FastAPI backend project.

## 🚀 Quick Start

### Local Deployment
```bash
cd terraform
./deploy.sh local quantum
```

### Remote Deployment
```bash
cd terraform
# Configure terraform.tfvars first (see Configuration section)
./deploy.sh remote quantum
```

## 📋 Prerequisites

- **Docker** installed and running
- **Terraform** >= 1.0
- **Node.js** >= 18 (for frontend builds)
- **Python** >= 3.11 (for backend)
- For remote deployment: SSH access to your server

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │
│   React/Vite    │    │   FastAPI       │
│   Port: 8086    │◄──►│   Port: 8087    │
│   nginx         │    │   Python        │
└─────────────────┘    └─────────────────┘
        │                       │
        └───────Docker Network───┘
```

### Key Features

- **Multi-environment**: Supports both local and remote deployment
- **Subdirectory routing**: Deploy to paths like `/quantum/` for multi-app servers
- **Health checks**: Built-in container health monitoring
- **Auto-restart**: Containers restart automatically on failure (remote)
- **Platform detection**: Automatically builds for correct architecture
- **Clean deployment**: Always starts fresh with `terraform destroy`

## 📁 Project Structure

```
project/
├── backend/
│   ├── Dockerfile              # FastAPI container
│   ├── requirements.txt        # Python dependencies
│   └── [your-api].py          # Main FastAPI application
├── terraform/
│   ├── main.tf                # Terraform infrastructure
│   ├── variables.tf           # Configuration variables
│   ├── outputs.tf             # Deployment outputs
│   ├── terraform.tfvars       # Your environment config
│   ├── deploy.sh              # Deployment script
│   └── README-deployment.md   # This file
├── Dockerfile                 # React frontend container
├── nginx.conf                 # Frontend web server config
├── package.json               # Frontend dependencies
└── [frontend source files]
```

## ⚙️ Configuration

### 1. Create `terraform/terraform.tfvars`

```hcl
# Quantum Computing Application Configuration
environment = "local"  # or "remote"

# Platform (auto-detected in deploy script)
build_platform = "linux/arm64"  # or "linux/amd64"

# Ports
backend_port = 8087
frontend_port = 8086

# Container names
backend_container_name = "quantum-backend"
frontend_container_name = "quantum-frontend"
docker_network_name = "quantum-network"

# Local API URL
api_url_local = "http://localhost:8087"

# Remote deployment (uncomment and configure)
# remote_domain = "yourdomain.com"
# droplet_ip = "YOUR_SERVER_IP"
# private_key_path = "droplet_key"
```

### 2. For Remote Deployment

Add your SSH private key as `terraform/droplet_key`:
```bash
cp ~/.ssh/your_key terraform/droplet_key
chmod 600 terraform/droplet_key
```

## 🔧 Usage

### Deployment Script

```bash
./deploy.sh [environment] [subdirectory]
```

**Parameters:**
- `environment`: `local` or `remote` (default: `local`)
- `subdirectory`: URL path for deployment (default: `quantum`)

### Examples

```bash
# Local development
./deploy.sh local                    # → http://localhost:8086/quantum/
./deploy.sh local myapp              # → http://localhost:8086/myapp/
./deploy.sh local root               # → http://localhost:8086/ (root)

# Remote production  
./deploy.sh remote                   # → https://yourdomain.com/quantum/
./deploy.sh remote portfolio         # → https://yourdomain.com/portfolio/
./deploy.sh remote root              # → https://yourdomain.com/ (root)
```

### Manual Terraform

```bash
cd terraform

# Initialize
terraform init

# Deploy locally
terraform apply -auto-approve \
  -var="environment=local" \
  -var="subdirectory_name=quantum" \
  -var="vite_base=/quantum/" \
  -var="vite_basename=/quantum"

# Deploy remotely
terraform apply -auto-approve \
  -var="environment=remote" \
  -var="build_platform=linux/amd64" \
  -var="subdirectory_name=quantum"

# Destroy
terraform destroy -auto-approve
```

## 🌐 Access Points

After successful deployment:

### Local
- **Frontend**: `http://localhost:8086/[subdirectory]/`
- **Backend API**: `http://localhost:8087/`
- **API Docs**: `http://localhost:8087/docs`
- **Health Check**: `http://localhost:8087/health`

### Remote
- **Frontend**: `https://yourdomain.com/[subdirectory]/`
- **Backend API**: `https://yourdomain.com/[subdirectory]-api/`
- **API Docs**: Backend URL + `/docs`
- **Health Check**: Backend URL + `/health`

## 🔧 Management Commands

### Check Status
```bash
# Local
docker ps
docker logs quantum-frontend
docker logs quantum-backend

# Remote
ssh root@YOUR_SERVER_IP 'docker ps'
ssh root@YOUR_SERVER_IP 'docker logs quantum-frontend'
```

### Stop Services
```bash
cd terraform
terraform destroy -auto-approve
```

### View Deployment Info
```bash
cd terraform
terraform output
```

## 🔄 Adapting for New Projects

To reuse this setup for a different project:

### 1. Update Variables
Edit `terraform/terraform.tfvars`:
```hcl
# Change project name
backend_container_name = "your-project-backend"
frontend_container_name = "your-project-frontend"
docker_network_name = "your-project-network"

# Update ports if needed
backend_port = 8087
frontend_port = 8086

# Update API URL
api_url_local = "http://localhost:8087"
```

### 2. Update Backend Dockerfile
Ensure `backend/Dockerfile` matches your backend technology:
```dockerfile
FROM python:3.11-slim  # or node:18-alpine for Node.js
# ... your specific setup
CMD uvicorn your_app:app --host 0.0.0.0 --port $PORT
```

### 3. Update Frontend Build
Ensure `Dockerfile` in project root builds your frontend:
```dockerfile
FROM node:20-alpine as build
# ... your build process
RUN npm run build  # or yarn build
```

### 4. Update nginx Config
Modify `nginx.conf` for your specific routing needs:
```nginx
# API proxy (adjust endpoint)
location /api/ {
    proxy_pass http://your-backend:8087/;
    # ...
}
```

### 5. Update Deploy Script
Optionally customize `terraform/deploy.sh`:
```bash
# Change default subdirectory
if [[ -z "$SUBDIRECTORY" ]]; then
    SUBDIRECTORY="your-app"  # Change this
    log_info "No subdirectory specified, using default: $SUBDIRECTORY"
fi
```

## 🔍 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check what's using ports
   lsof -i :8086
   lsof -i :8087
   ```

2. **Docker Build Failures**
   ```bash
   # Clear Docker cache
   docker system prune -a
   
   # Check build logs
   docker build --no-cache -t test-build .
   ```

3. **Permission Errors**
   ```bash
   # Fix SSH key permissions
   chmod 600 terraform/droplet_key
   ```

4. **Terraform State Issues**
   ```bash
   # Clean slate
   cd terraform
   rm -rf .terraform* terraform.tfstate*
   terraform init
   ```

### Debugging

```bash
# Check container logs
docker logs quantum-frontend --follow
docker logs quantum-backend --follow

# Test API connectivity
curl http://localhost:8087/health

# Inspect network
docker network ls
docker network inspect quantum-network

# Test frontend build
docker build --platform linux/amd64 -t test-frontend .
```

## 📈 Production Considerations

### Security
- Use HTTPS with proper SSL certificates
- Implement proper CORS policies
- Use secrets management for API keys
- Regular security updates

### Monitoring
- Add logging aggregation (e.g., ELK stack)
- Implement proper health checks
- Monitor resource usage
- Set up alerting

### Scaling
- Use Docker Compose for multi-instance deployment
- Consider Kubernetes for larger scale
- Implement load balancing
- Database clustering if needed

## 📝 License

This deployment configuration is provided as-is for educational and development purposes. Adapt as needed for your specific requirements.

---

**Created for**: Quantum Computing Educational Application  
**Adaptable for**: Any React + FastAPI (or similar) stack  
**Author**: Diorama Consulting Ltd 