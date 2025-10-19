# Use Nginx to serve static files
FROM docker.io/nginx:1.27-alpine AS runtime

# Copy Nginx config with SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY dist /usr/share/nginx/html

EXPOSE 80

# Use the default Nginx entrypoint/cmd
