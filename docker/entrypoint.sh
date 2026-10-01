#!/bin/sh
# Runtime API URL configuration for the frontend.
#
# The Vite build bakes a default API URL (http://localhost:8000) into
# the JavaScript bundles at build time. This script replaces that
# default with the value of VITE_API_BASE_URL from the container
# environment so the backend URL is configurable without rebuilding.

API_URL="${VITE_API_BASE_URL:-http://localhost:8000}"
# Remove trailing slash (matches the app's own normalization logic)
API_URL="${API_URL%/}"

if [ "$API_URL" != "http://localhost:8000" ]; then
    # Replace the default backend URL in built JS assets
    if [ -d /usr/share/nginx/html/assets ]; then
        find /usr/share/nginx/html/assets -name "*.js" -exec \
            sed -i "s|http://localhost:8000|${API_URL}|g" {} + 2>/dev/null || true
    fi
    echo "Frontend API URL configured to: $API_URL"
else
    echo "Frontend API URL using default: http://localhost:8000"
fi
