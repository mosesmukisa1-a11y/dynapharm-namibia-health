# 🚀 Railway Database Setup - Copy-Paste Commands

## Quick Setup (Easiest Method)

### Step 1: Get Your Railway DATABASE_URL

1. Go to Railway → Your PostgreSQL service → **Variables** tab
2. Copy the `DATABASE_URL` value

### Step 2: Run This Command

Replace `YOUR_DATABASE_URL` with your actual Railway DATABASE_URL:

```bash
cd /Users/moseswalker/Downloads/dynapharm-namibia-health-3 && \
export DATABASE_URL='YOUR_DATABASE_URL' && \
psql "$DATABASE_URL" -f backend/db_schema.sql && \
psql "$DATABASE_URL" -f backend/db_enhancements.sql && \
echo "✅ Database setup complete!"
```

### Example (with actual format):

```bash
cd /Users/moseswalker/Downloads/dynapharm-namibia-health-3 && \
export DATABASE_URL='postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway' && \
psql "$DATABASE_URL" -f backend/db_schema.sql && \
psql "$DATABASE_URL" -f backend/db_enhancements.sql && \
echo "✅ Database setup complete!"
```

---

## Using the Automated Script

Or use the script I created:

```bash
cd /Users/moseswalker/Downloads/dynapharm-namibia-health-3 && \
./setup-railway-database.sh
```

This script will prompt you for your DATABASE_URL.

---

## One-Line Command (Copy Entire Line)

**Option A: With prompt for DATABASE_URL**
```bash
cd /Users/moseswalker/Downloads/dynapharm-namibia-health-3 && read -p "Enter Railway DATABASE_URL: " DB_URL && export DATABASE_URL="$DB_URL" && psql "$DATABASE_URL" -f backend/db_schema.sql && psql "$DATABASE_URL" -f backend/db_enhancements.sql && echo "✅ Done! Tables created."
```

**Option B: Replace YOUR_URL first, then run**
```bash
cd /Users/moseswalker/Downloads/dynapharm-namibia-health-3 && export DATABASE_URL='YOUR_URL_HERE' && psql "$DATABASE_URL" -f backend/db_schema.sql && psql "$DATABASE_URL" -f backend/db_enhancements.sql
```

---

## Verify It Worked

After running, verify with:

```bash
psql "$DATABASE_URL" -c "\dt"
```

Should show 21 tables.

---

## Troubleshooting

If you get "psql: command not found":
```bash
brew install postgresql
```

Then try again!
