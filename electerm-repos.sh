#!/bin/bash

# Simple Electerm Repository Server startup script
# Use with PM2 for process management

set -e

# Get script directory and change to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Set production environment
export NODE_ENV=production
export PORT=${PORT:-8030}

# Load .env file if it exists
if [ -f ".env" ]; then
    echo "Loading environment from .env file..."
    set -a
    source .env
    set +a
else
    echo "Warning: .env file not found"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm ci --only=production
fi

# Start the server
echo "Starting Electerm Repository Server..."
echo "Working directory: $(pwd)"
echo "Node environment: $NODE_ENV"
echo "Port: $PORT"

exec node src/server/app.js
