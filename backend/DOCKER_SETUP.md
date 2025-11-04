# Docker Setup for PostgreSQL

## Using Docker (Optional)

If you prefer to run PostgreSQL in Docker instead of a local installation:

### 1. Start PostgreSQL with Docker:
```bash
cd backend
docker-compose up -d
```

### 2. Update environment variables:
Create a `.env` file with:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dynapharm
DB_USER=dynapharm
DB_PASSWORD=dynapharm_password
```

### 3. Initialize database:
```bash
python3 init_database.py
```

### 4. Stop Docker container:
```bash
docker-compose down
```

## Current Setup (Local PostgreSQL)

Your system is currently using local PostgreSQL installation, which is recommended for development.

To switch to Docker later, just:
1. Stop local PostgreSQL: `brew services stop postgresql@15`
2. Start Docker: `docker-compose up -d`
3. Update `.env` file
4. Restart backend

