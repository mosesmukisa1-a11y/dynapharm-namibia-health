# 🚀 Dynapharm Cloud Deployment Guide

Deploy your Dynapharm system to Railway (Backend), Vercel (Frontend), and GitHub for bulletproof cloud hosting.

## 📋 Prerequisites

- Railway account: `mosesmukisa1-a11y`
- Vercel account: `mosesmukisa1-a11y`
- GitHub account: `mosesmukisa1-a11y`

## 🎯 Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Railway       │    │   GitHub        │
│   (Frontend)    │◄──►│   (Backend API) │◄──►│   (Repository)  │
│                 │    │                 │    │                 │
│ dynapharm.com   │    │ api.railway.app │    │ Source Code     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🚂 Step 1: Deploy Backend to Railway

### 1.1 Create Railway Project
1. Go to [Railway.app](https://railway.app)
2. Login with your account: `mosesmukisa1-a11y`
3. Click "New Project"
4. Choose "Deploy from GitHub repo"

### 1.2 Prepare Backend Files
Upload these files to your GitHub repository:
- `dynapharm_backend.py`
- `requirements.txt`
- `railway.json`
- `Procfile`
- `dynapharm_data/` folder (if it exists)

### 1.3 Deploy to Railway
1. Select your GitHub repository
2. Railway will auto-detect Python and deploy
3. Your backend will be available at: `https://your-project-name.up.railway.app`

### 1.4 Configure Environment Variables
In Railway dashboard, add:
- `PORT=8001` (Railway will override this automatically)
- Any other environment variables needed

---

## 🌐 Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Project
1. Go to [Vercel.com](https://vercel.com)
2. Login with your account: `mosesmukisa1-a11y`
3. Click "New Project"
4. Import from GitHub repository

### 2.2 Prepare Frontend Files
Upload these files to your GitHub repository:
- `dynapharm-complete-system-cloud.html` (rename to `index.html`)
- `vercel.json`

### 2.3 Deploy to Vercel
1. Select your GitHub repository
2. Vercel will auto-deploy
3. Your frontend will be available at: `https://your-project-name.vercel.app`

### 2.4 Configure Custom Domain (Optional)
1. In Vercel dashboard, go to Settings → Domains
2. Add your custom domain (e.g., `dynapharm.com`)
3. Configure DNS records as instructed

---

## 🔧 Step 3: Update API Endpoint

### 3.1 Update Frontend Configuration
In `dynapharm-complete-system-cloud.html`, update the API endpoint:

```javascript
// Replace this line:
API_BASE = 'https://dynapharm-backend-production.up.railway.app/api';

// With your actual Railway URL:
API_BASE = 'https://your-railway-project.up.railway.app/api';
```

### 3.2 Redeploy Frontend
After updating the API endpoint:
1. Commit changes to GitHub
2. Vercel will auto-redeploy
3. Test the connection

---

## 📁 Step 4: GitHub Repository Setup

### 4.1 Create Repository Structure
```
dynapharm-cloud/
├── backend/
│   ├── dynapharm_backend.py
│   ├── requirements.txt
│   ├── railway.json
│   ├── Procfile
│   └── dynapharm_data/
├── frontend/
│   ├── index.html (renamed from dynapharm-complete-system-cloud.html)
│   └── vercel.json
├── README.md
└── DEPLOYMENT_GUIDE.md
```

### 4.2 Upload to GitHub
1. Create new repository: `dynapharm-cloud`
2. Upload all files
3. Set up branches:
   - `main` - Production deployments
   - `develop` - Development/testing

---

## 🔄 Step 5: Automated Deployments

### 5.1 Railway Auto-Deploy
- Railway automatically deploys on every push to main branch
- Backend updates are instant

### 5.2 Vercel Auto-Deploy
- Vercel automatically deploys on every push to main branch
- Frontend updates are instant

### 5.3 GitHub Actions (Optional)
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        run: echo "Railway auto-deploys on push"
      - name: Deploy to Vercel
        run: echo "Vercel auto-deploys on push"
```

---

## 🌍 Step 6: Production URLs

After deployment, your system will be available at:

### Frontend (Vercel)
- **Production**: `https://dynapharm-cloud.vercel.app`
- **Custom Domain**: `https://dynapharm.com` (if configured)

### Backend (Railway)
- **API Endpoint**: `https://dynapharm-backend-production.up.railway.app/api`
- **Health Check**: `https://dynapharm-backend-production.up.railway.app/api/health`

---

## 🔐 Step 7: Security & Performance

### 7.1 Enable HTTPS
- Both Railway and Vercel provide free SSL certificates
- HTTPS is enabled by default

### 7.2 Environment Variables
Set these in Railway dashboard:
```
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### 7.3 Database (Optional)
For production, consider upgrading to:
- **Railway PostgreSQL**: For persistent data storage
- **MongoDB Atlas**: For document-based storage
- **Supabase**: For full-featured backend

---

## 📊 Step 8: Monitoring & Analytics

### 8.1 Railway Monitoring
- View logs in Railway dashboard
- Monitor API performance
- Set up alerts for downtime

### 8.2 Vercel Analytics
- Enable Vercel Analytics
- Monitor frontend performance
- Track user engagement

### 8.3 Health Checks
Test your deployment:
```bash
# Backend health check
curl https://your-railway-project.up.railway.app/api/health

# Frontend check
curl https://your-vercel-project.vercel.app
```

---

## 🚨 Troubleshooting

### Common Issues

**1. CORS Errors**
- Ensure Railway backend allows your Vercel domain
- Check CORS headers in backend code

**2. API Connection Failed**
- Verify Railway URL is correct
- Check Railway deployment logs
- Ensure environment variables are set

**3. Frontend Not Loading**
- Check Vercel deployment status
- Verify file paths and names
- Check browser console for errors

### Support
- **Railway**: [Railway Documentation](https://docs.railway.app)
- **Vercel**: [Vercel Documentation](https://vercel.com/docs)
- **GitHub**: [GitHub Actions](https://docs.github.com/en/actions)

---

## 🎉 Success!

Your Dynapharm system is now:
- ✅ **Cloud-hosted** on Railway + Vercel
- ✅ **Auto-scaling** with traffic
- ✅ **SSL-secured** with HTTPS
- ✅ **Auto-deploying** on code changes
- ✅ **Globally accessible** 24/7
- ✅ **Backup-protected** via GitHub

**Access your system**: `https://your-domain.vercel.app`

---

## 📞 Support Contacts

- **Technical Issues**: Check deployment logs first
- **Railway Support**: [Railway Discord](https://discord.gg/railway)
- **Vercel Support**: [Vercel Community](https://github.com/vercel/vercel/discussions)
