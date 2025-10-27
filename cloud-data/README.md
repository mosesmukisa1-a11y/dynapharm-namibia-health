# Cloud Data Storage

This directory will store cloud-synced data files for the Dynapharm system.

## How it works:
1. Data is automatically synced to this directory
2. Files are committed to GitHub for permanent storage
3. All devices can access the same data
4. Data never disappears - it's backed up in GitHub

## Files:
- `data.json` - Complete system data snapshot
- `clients.json` - Client records
- `reports.json` - Health consultation reports
- `users.json` - User accounts
- `branches.json` - Branch locations

## Manual backup:
Run this in console:
```javascript
cloudStorage.saveToCloud()
```

This downloads a backup file you can upload to this directory.
