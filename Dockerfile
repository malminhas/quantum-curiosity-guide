# Build stage
FROM node:20-alpine as build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Remove package-lock.json to avoid ARM64 rollup issues
RUN rm -f package-lock.json

# Install dependencies (use npm install instead of npm ci for ARM64 compatibility)
RUN npm install --silent

# Copy source code
COPY . .

# Build arguments
ARG VITE_API_URL
ARG VITE_BASE
ARG VITE_BASENAME

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BASE=$VITE_BASE
ENV VITE_BASENAME=$VITE_BASENAME

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 8086
EXPOSE 8086

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8086/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 