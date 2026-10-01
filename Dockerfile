# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Remove default nginx config and use custom SPA config
RUN rm /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist/client /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Runtime API URL configuration entrypoint
# Replaces the default backend URL (http://localhost:8000) in built
# JavaScript files with the value of VITE_API_BASE_URL at container startup.
COPY docker/entrypoint.sh /docker-entrypoint.d/20-config-api-url.sh
RUN chmod +x /docker-entrypoint.d/20-config-api-url.sh

EXPOSE 80
