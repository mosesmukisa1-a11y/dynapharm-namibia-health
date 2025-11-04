# Complete System Connection Guide

## ✅ Database Setup Complete

1. **PostgreSQL Installed**: ✅
2. **Database Created**: ✅ `dynapharm`
3. **Schema Initialized**: ✅ All 18 tables created
4. **Default Branches**: ✅ 15 branches inserted

## 🔌 Connecting Frontend to Backend

### Step 1: Start the Backend Server

```bash
cd backend
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
python3 dynapharm_backend.py
```

The backend will start on `http://localhost:8001`

### Step 2: Configure Frontend to Use Local Backend

Edit `dynapharm-complete-system.html` and add this meta tag (around line 155):

```html
<meta name="api-base" content="http://localhost:8001/api">
```

Or update the API_BASE constant in the JavaScript (around line 7085):

```javascript
const API_BASE = 'http://localhost:8001/api';
```

### Step 3: Update Frontend JavaScript APIs

The frontend currently uses localStorage. To connect to PostgreSQL:

1. **Find API calls** - Look for `localStorage.getItem('dyna_')` patterns
2. **Replace with fetch calls** - Use the backend API endpoints:
   - `GET /api/branches` - Get all branches
   - `GET /api/users` - Get all users
   - `GET /api/clients` - Get all clients
   - `GET /api/products` - Get all products
   - `GET /api/reports` - Get all reports
   - `GET /api/orders` - Get all orders
   - `POST /api/{resource}` - Create new records
   - `PUT /api/{resource}` - Update records
   - `DELETE /api/{resource}?id={id}` - Delete records

### Step 4: Test the Connection

1. Open `dynapharm-complete-system.html` in browser
2. Open browser console (F12)
3. Check for API calls to `http://localhost:8001/api`
4. Verify data is loading from PostgreSQL

## 📝 Environment Variables

Create a `.env` file in the `backend` directory:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dynapharm
DB_USER=moseswalker
DB_PASSWORD=
PORT=8001
```

Or set them before starting:
```bash
export DB_USER=moseswalker
export DB_PASSWORD=""
python3 dynapharm_backend.py
```

## 🐳 Docker Setup (Optional)

If you want to use Docker for PostgreSQL:

```bash
cd backend
docker-compose up -d
```

Then update `.env`:
```
DB_USER=dynapharm
DB_PASSWORD=dynapharm_password
```

## 🔍 Verify Database Connection

Test that backend can connect:

```bash
cd backend
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
python3 -c "
from db_connection import init_db_pool, get_db_connection, return_db_connection
if init_db_pool():
    conn = get_db_connection()
    if conn:
        print('✅ Database connection successful!')
        return_db_connection(conn)
    else:
        print('❌ Failed to get connection')
else:
    print('❌ Failed to initialize pool')
"
```

## 🚀 Quick Start Commands

```bash
# 1. Start PostgreSQL (if not already running)
brew services start postgresql@15

# 2. Start Backend
cd backend
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
python3 dynapharm_backend.py

# 3. Open frontend in browser
# Edit line 155 to set: <meta name="api-base" content="http://localhost:8001/api">
# Then open: dynapharm-complete-system.html
```

## 📊 Current Status

- ✅ PostgreSQL database ready
- ✅ Backend API endpoints ready
- ✅ Database schema initialized
- ⚠️ Frontend needs API_BASE configuration
- ⚠️ Frontend JavaScript needs to call backend APIs instead of localStorage

## 🎯 Next Steps

1. Update frontend HTML to point to local backend
2. Replace localStorage calls with fetch() calls to backend
3. Test all functionality
4. Deploy to production when ready

