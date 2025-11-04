#!/bin/bash
# Start Dynapharm Backend with PostgreSQL

# Add PostgreSQL to PATH
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Set database environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=dynapharm
export DB_USER=$(whoami)
export DB_PASSWORD=""

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "⚠️  PostgreSQL is not running. Starting it..."
    brew services start postgresql@15
    sleep 2
fi

# Check database connection
python3 -c "
from db_connection import init_db_pool
if init_db_pool():
    print('✅ Database connection ready')
else:
    print('❌ Database connection failed')
    exit(1)
" || exit 1

echo "🚀 Starting Dynapharm Backend Server..."
echo "📊 Using PostgreSQL database"
echo "📡 API will be available at: http://localhost:8001/api"
echo ""

# Start the backend server
python3 dynapharm_backend.py

