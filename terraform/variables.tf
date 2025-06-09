variable "docker_network_name" {
  description = "Name of the Docker network to create."
  type        = string
  default     = "quantum-network"
}

variable "backend_port" {
  description = "Port for the backend container"
  type        = number
  default     = 8087
}

variable "frontend_port" {
  description = "Port for the frontend container"
  type        = number
  default     = 8086
}

variable "environment" {
  description = "Deployment environment (local or remote)"
  type        = string
  default     = "local"
  validation {
    condition     = contains(["local", "remote"], var.environment)
    error_message = "Environment must be either 'local' or 'remote'."
  }
}

variable "droplet_ip" {
  description = "IP address of the remote droplet"
  type        = string
  default     = ""
}

variable "private_key_path" {
  description = "Path to the private key file for SSH access"
  type        = string
  default     = ""
}

variable "build_platform" {
  description = "Docker build platform (linux/amd64 or linux/arm64)"
  type        = string
  default     = "linux/amd64"
}

variable "backend_container_name" {
  description = "Name of the backend container"
  type        = string
  default     = "quantum-backend"
}

variable "frontend_container_name" {
  description = "Name of the frontend container"
  type        = string
  default     = "quantum-frontend"
}

variable "api_url_local" {
  description = "API URL for local environment"
  type        = string
  default     = "http://localhost:8087"
}

variable "api_url_remote" {
  description = "API URL for remote environment"
  type        = string
  default     = ""
}

variable "remote_domain" {
  description = "Domain name for remote deployment (without https://)"
  type        = string
  default     = ""
}

variable "vite_base" {
  description = "Vite base path for the build"
  type        = string
  default     = "/"
}

variable "vite_basename" {
  description = "React Router basename for the build"
  type        = string
  default     = "/"
}

variable "subdirectory_name" {
  description = "Name of the subdirectory for deployment (empty for root deployment)"
  type        = string
  default     = ""
}