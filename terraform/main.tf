terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0.0"
    }
  }
}

# Local Docker provider
provider "docker" {
  host = "unix:///var/run/docker.sock"
}

# Remote Docker provider for deployment
provider "docker" {
  alias = "remote"
  host  = "ssh://root@${var.droplet_ip}"
  ssh_opts = ["-i", var.private_key_path]
}

locals {
  env_content = fileexists("${path.root}/../.env") ? file("${path.root}/../.env") : ""
  workspace_dir = abspath(path.root)
  project_root = dirname(local.workspace_dir)
  
  # Determine if we're deploying to a subdirectory
  is_subdirectory = var.subdirectory_name != ""
  
  # Dynamic API URL based on environment and subdirectory
  api_url = var.environment == "local" ? var.api_url_local : (
    var.api_url_remote != "" ? var.api_url_remote : (
      local.is_subdirectory ? 
      "https://${var.remote_domain}/${var.subdirectory_name}-api" : 
      "https://${var.remote_domain}/api"
    )
  )
  
  # Dynamic root path for FastAPI
  api_root_path = var.environment == "local" ? "" : (
    local.is_subdirectory ? 
    "/${var.subdirectory_name}-api" : 
    "/api"
  )
  
  # Dynamic Vite base path - use subdirectory for both local and remote if specified
  vite_base = local.is_subdirectory ? "/${var.subdirectory_name}/" : "/"
  
  # Dynamic React Router basename - use subdirectory for both local and remote if specified
  vite_basename = local.is_subdirectory ? "/${var.subdirectory_name}" : "/"
}

# Local cleanup resource to properly handle existing containers and network
resource "null_resource" "local_cleanup" {
  count = var.environment == "local" ? 1 : 0

  provisioner "local-exec" {
    command = <<-EOT
      echo 'Cleaning up existing quantum containers and network...'
      docker stop ${var.backend_container_name} ${var.frontend_container_name} 2>/dev/null || true
      docker rm ${var.backend_container_name} ${var.frontend_container_name} 2>/dev/null || true
      docker network rm ${var.docker_network_name} 2>/dev/null || true
      echo 'Local cleanup completed'
    EOT
  }
}

# Create a Docker network for local deployment
resource "docker_network" "quantum_network" {
  count = var.environment == "local" ? 1 : 0
  depends_on = [null_resource.local_cleanup]
  name = var.docker_network_name
}

# Remote cleanup resource to properly handle existing containers
resource "null_resource" "remote_cleanup" {
  count = var.environment == "remote" ? 1 : 0

  provisioner "remote-exec" {
    connection {
      type        = "ssh"
      user        = "root"
      private_key = file(var.private_key_path)
      host        = var.droplet_ip
    }
    
    inline = [
      "echo 'Cleaning up existing quantum containers and network...'",
      "docker stop ${var.backend_container_name} ${var.frontend_container_name} 2>/dev/null || true",
      "docker rm ${var.backend_container_name} ${var.frontend_container_name} 2>/dev/null || true",
      "docker network rm ${var.docker_network_name} 2>/dev/null || true",
      "echo 'Cleanup completed, creating network...'",
      "docker network create ${var.docker_network_name}"
    ]
  }
}

# Cleanup resource to ensure proper destroy order
resource "null_resource" "cleanup_on_destroy" {
  count = var.environment == "local" ? 1 : 0
  depends_on = [null_resource.run_local_frontend_container, null_resource.run_local_backend_container]

  # Store values as triggers so they're available during destroy
  triggers = {
    backend_container_name = var.backend_container_name
    frontend_container_name = var.frontend_container_name
    docker_network_name = var.docker_network_name
  }

  provisioner "local-exec" {
    when = destroy
    command = <<-EOT
      # Force remove containers first
      docker rm -f ${self.triggers.backend_container_name} ${self.triggers.frontend_container_name} 2>/dev/null || true
      # Wait a moment for containers to fully stop
      sleep 2
      # Remove network if it exists
      docker network rm ${self.triggers.docker_network_name} 2>/dev/null || true
    EOT
  }
}

# Clean up old resources for backend
resource "null_resource" "cleanup_backend" {
  provisioner "local-exec" {
    command = <<-EOT
      rm -f ${var.backend_container_name}.tar
      docker rm -f ${var.backend_container_name} 2>/dev/null || true
      docker rmi ${var.backend_container_name}:latest 2>/dev/null || true
    EOT
  }
}

# Build the backend image using buildx
resource "null_resource" "build_backend_image" {
  depends_on = [null_resource.cleanup_backend]
  
  provisioner "local-exec" {
    command = "docker buildx build --platform ${var.build_platform} --no-cache -t ${var.backend_container_name}:latest --build-arg PORT=${var.backend_port} --build-arg ROOT_PATH=${local.api_root_path} --load ${path.root}/../backend"
  }
}

# Start the backend container locally
resource "null_resource" "run_local_backend_container" {
  count = var.environment == "local" ? 1 : 0
  depends_on = [null_resource.build_backend_image, docker_network.quantum_network]

  provisioner "local-exec" {
    command = <<-EOT
      docker rm -f ${var.backend_container_name} 2>/dev/null || true
      docker run -d --name ${var.backend_container_name} --network ${var.docker_network_name} -p ${var.backend_port}:${var.backend_port} --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 -e PORT=${var.backend_port} -e ROOT_PATH=${local.api_root_path} ${var.backend_container_name}:latest
    EOT
  }

  # Store container name for destroy-time access
  triggers = {
    container_name = var.backend_container_name
  }

  # Ensure container is removed before network during destroy
  provisioner "local-exec" {
    when    = destroy
    command = "docker rm -f ${self.triggers.container_name} 2>/dev/null || true"
  }
}

# Clean up old resources for frontend
resource "null_resource" "cleanup_frontend" {
  provisioner "local-exec" {
    command = <<-EOT
      rm -f ${var.frontend_container_name}.tar
      docker rm -f ${var.frontend_container_name} 2>/dev/null || true
      docker rmi ${var.frontend_container_name}:latest 2>/dev/null || true
    EOT
  }
}

# Build the frontend image using buildx
resource "null_resource" "build_frontend_image" {
  depends_on = [null_resource.cleanup_frontend]
  
  provisioner "local-exec" {
    command = "docker buildx build --platform ${var.build_platform} --no-cache -t ${var.frontend_container_name}:latest --build-arg VITE_API_URL=${local.api_url} --build-arg VITE_BASE=${local.vite_base} --build-arg VITE_BASENAME=${local.vite_basename} --load ${path.root}/.."
  }
}

# Start the frontend container locally
resource "null_resource" "run_local_frontend_container" {
  count = var.environment == "local" ? 1 : 0
  depends_on = [null_resource.build_frontend_image, null_resource.run_local_backend_container]

  provisioner "local-exec" {
    command = <<-EOT
      docker rm -f ${var.frontend_container_name} 2>/dev/null || true
      docker run -d --name ${var.frontend_container_name} --network ${var.docker_network_name} -p ${var.frontend_port}:${var.frontend_port} --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 -e VITE_API_URL=${local.api_url} ${var.frontend_container_name}:latest
    EOT
  }

  # Store container name for destroy-time access
  triggers = {
    container_name = var.frontend_container_name
  }

  # Ensure container is removed before network during destroy
  provisioner "local-exec" {
    when    = destroy
    command = "docker rm -f ${self.triggers.container_name} 2>/dev/null || true"
  }
}

# Remote deployment resources for backend
resource "null_resource" "save_backend_image" {
  count    = var.environment == "remote" ? 1 : 0
  depends_on = [null_resource.build_backend_image]
  
  provisioner "local-exec" {
    command = "docker save ${var.backend_container_name}:latest > ${var.backend_container_name}.tar"
  }
}

resource "null_resource" "copy_backend_image" {
  count    = var.environment == "remote" ? 1 : 0
  depends_on = [null_resource.save_backend_image]
  
  provisioner "local-exec" {
    command = "scp -i ${var.private_key_path} ${var.backend_container_name}.tar root@${var.droplet_ip}:/root/"
  }
}

resource "null_resource" "load_backend_image" {
  count    = var.environment == "remote" ? 1 : 0
  depends_on = [null_resource.copy_backend_image]
  
  provisioner "remote-exec" {
    connection {
      type        = "ssh"
      user        = "root"
      private_key = file(var.private_key_path)
      host        = var.droplet_ip
    }
    
    inline = [
      "IMAGE_ID=$(docker load < /root/${var.backend_container_name}.tar | awk -F': ' '/Loaded image:/ {print $2}')",
      "docker tag $IMAGE_ID ${var.backend_container_name}:latest"
    ]
  }
}

resource "null_resource" "run_backend_container" {
  count    = var.environment == "remote" ? 1 : 0
  depends_on = [null_resource.load_backend_image, null_resource.remote_cleanup]

  provisioner "remote-exec" {
    connection {
      type        = "ssh"
      user        = "root"
      private_key = file(var.private_key_path)
      host        = var.droplet_ip
    }
    inline = [
      "docker rm -f ${var.backend_container_name} 2>/dev/null || true",
      "docker run -d --restart unless-stopped --name ${var.backend_container_name} --network ${var.docker_network_name} -p ${var.backend_port}:${var.backend_port} --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 -e PORT=${var.backend_port} -e ROOT_PATH=${local.api_root_path} ${var.backend_container_name}:latest"
    ]
  }
}

# Remote deployment resources for frontend
resource "null_resource" "save_frontend_image" {
  count    = var.environment == "remote" ? 1 : 0
  depends_on = [null_resource.build_frontend_image]
  
  provisioner "local-exec" {
    command = "docker save ${var.frontend_container_name}:latest > ${var.frontend_container_name}.tar"
  }
}

resource "null_resource" "copy_frontend_image" {
  count    = var.environment == "remote" ? 1 : 0
  depends_on = [null_resource.save_frontend_image]
  
  provisioner "local-exec" {
    command = "scp -i ${var.private_key_path} ${var.frontend_container_name}.tar root@${var.droplet_ip}:/root/"
  }
}

resource "null_resource" "load_frontend_image" {
  count    = var.environment == "remote" ? 1 : 0
  depends_on = [null_resource.copy_frontend_image]
  
  provisioner "remote-exec" {
    connection {
      type        = "ssh"
      user        = "root"
      private_key = file(var.private_key_path)
      host        = var.droplet_ip
    }
    
    inline = [
      "IMAGE_ID=$(docker load < /root/${var.frontend_container_name}.tar | awk -F': ' '/Loaded image:/ {print $2}')",
      "docker tag $IMAGE_ID ${var.frontend_container_name}:latest"
    ]
  }
}

resource "null_resource" "run_frontend_container" {
  count    = var.environment == "remote" ? 1 : 0
  depends_on = [null_resource.load_frontend_image, null_resource.run_backend_container]

  provisioner "remote-exec" {
    connection {
      type        = "ssh"
      user        = "root"
      private_key = file(var.private_key_path)
      host        = var.droplet_ip
    }
    inline = [
      "docker rm -f ${var.frontend_container_name} 2>/dev/null || true",
      "docker run -d --restart unless-stopped --name ${var.frontend_container_name} --network ${var.docker_network_name} -p ${var.frontend_port}:${var.frontend_port} --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 -e VITE_API_URL=${local.api_url} ${var.frontend_container_name}:latest"
    ]
  }
} 