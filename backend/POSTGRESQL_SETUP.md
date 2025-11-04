# PostgreSQL Setup Guide for Dynapharm

## Prerequisites
1. PostgreSQL installed (version 12+)
2. Python 3.8+
3. Database created

## Setup Steps

### 1. Install PostgreSQL
- **macOS**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql`
- **Windows**: Download from postgresql.org

### 2. Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE dynapharm;

# Create user (optional)
CREATE USER dynapharm_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE dynapharm TO dynapharm_user;
```

### 3. Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 4. Set Environment Variables
Create a `.env` file or set environment variables:

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=dynapharm
export DB_USER=postgres
export DB_PASSWORD=your_password
```

### 5. Initialize Database Schema
```bash
cd backend
python init_database.py
```

This will:
- Create all tables
- Insert default 15 branches
- Set up indexes and constraints

### 6. Verify Setup
```bash
psql -U postgres -d dynapharm -c "SELECT COUNT(*) FROM branches;"
# Should return 15
```

## Next Steps
- Update backend API to use PostgreSQL
- Migrate existing data from JSON files
- Update frontend to use new endpoints

