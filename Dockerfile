# Multi-stage build for Raspberry Pi (ARM) — Node build + Nginx serve
# Stage 1: Build the Vite app
FROM node:20-alpine AS build

# Configure build-time env (Vite only exposes vars prefixed with VITE_)
ARG VITE_API_MODE=local
ARG VITE_API_BASE=localhost:9005
ARG VITE_API_BASE_PROD=localhost:9005
ARG VITE_API_BASE_TEST=192.168.1.120:9005

ENV VITE_API_MODE=${VITE_API_MODE} \
    VITE_API_BASE=${VITE_API_BASE} \
    VITE_API_BASE_PROD=${VITE_API_BASE_PROD} \
    VITE_API_BASE_TEST=${VITE_API_BASE_TEST}

WORKDIR /app

# Install deps with better caching
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy the rest of the source
COPY . .

# Build static assets
RUN npm run build

# Stage 2: Nginx to serve static files
FROM nginx:1.27-alpine AS runtime

# Copy Nginx config with SPA fallback
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Use the default Nginx entrypoint/cmd
