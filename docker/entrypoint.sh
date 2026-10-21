#!/bin/sh

API_URL="${VITE_API_BASE_URL:-http://localhost:8000}"
API_URL="${API_URL%/}"

if [ "$API_URL" != "http://localhost:8000" ]; then
    if [ -d /usr/share/nginx/html/assets ]; then
        find /usr/share/nginx/html/assets -name "*.js" -exec \
            sed -i "s|http://localhost:8000|${API_URL}|g" {} + 2>/dev/null || true
    fi
    echo "Frontend API URL configured to: $API_URL"
else
    echo "Frontend API URL using default: http://localhost:8000"
fi
