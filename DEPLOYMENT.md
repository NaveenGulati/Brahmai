# 🚀 Production Deployment Guide

## Overview

This guide will walk you through deploying the ICSE Grade 7 Quiz Master application to production using:

- **GitHub** - Version control and source code hosting
- **PlanetScale** - Serverless MySQL database
- **Render** - Application hosting and deployment
- **GoDaddy** - Custom domain configuration

---

## Prerequisites

Before starting, ensure you have:

- [ ] GitHub account
- [ ] PlanetScale account (free tier available)
- [ ] Render account (free tier available)
- [ ] GoDaddy domain purchased
- [ ] All environment variables ready (see below)

---

## Phase 1: Prepare Application

### 1.1 Review Build Configuration

The application is already configured for production:

```json
{
  "scripts": {
    "build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js"
  }
}
```

### 1.2 Test Production Build Locally

```bash
# Build the application
pnpm build

# Test production server
pnpm start
```

**Note:** If build fails due to memory constraints, that's okay - Render has more resources.

---

## Phase 2: GitHub Setup

### 2.1 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `grade7-quiz-app` (or your choice)
3. Set to **Private** (recommended for production apps)
4. Do NOT initialize with README (we have existing code)
5. Click "Create repository"

### 2.2 Push Code to GitHub

```bash
cd /home/ubuntu/grade7-quiz-app

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Production ready"

# Add remote (replace with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/grade7-quiz-app.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 2.3 Verify on GitHub

Visit your repository URL and confirm all files are uploaded.

---

## Phase 3: PlanetScale Database Setup

### 3.1 Create Database

1. Go to https://planetscale.com/
2. Sign up or log in
3. Click "Create a database"
4. Database name: `grade7-quiz-app`
5. Region: Choose closest to your users (e.g., `us-east`, `ap-south`)
6. Plan: Select **Hobby** (free tier)
7. Click "Create database"

### 3.2 Get Connection String

1. In your database dashboard, click "Connect"
2. Select "Node.js" as the framework
3. Copy the connection string (format: `mysql://user:pass@host/database?ssl={"rejectUnauthorized":true}`)
4. **Save this** - you'll need it for Render

Example format:
```
mysql://username:password@aws.connect.psdb.cloud/grade7-quiz-app?ssl={"rejectUnauthorized":true}
```

### 3.3 Create Database Schema

**Option A: Using PlanetScale CLI**

```bash
# Install PlanetScale CLI
curl -sL https://planetscale.com/install.sh | sh

# Login
pscale auth login

# Connect to database
pscale connect grade7-quiz-app main

# In another terminal, run migrations
DATABASE_URL="mysql://127.0.0.1:3306/grade7-quiz-app" pnpm db:push
```

**Option B: Using Render (after deployment)**

We'll run migrations automatically after deploying to Render.

---

## Phase 4: Render Deployment

### 4.1 Create New Web Service

1. Go to https://render.com/
2. Sign up or log in
3. Click "New +" → "Web Service"
4. Connect your GitHub account
5. Select your `grade7-quiz-app` repository
6. Click "Connect"

### 4.2 Configure Service

**Basic Settings:**
- Name: `grade7-quiz-app`
- Region: Same as PlanetScale (e.g., Oregon, Singapore)
- Branch: `main`
- Runtime: `Node`
- Build Command: `pnpm install && pnpm build`
- Start Command: `pnpm start`
- Plan: **Starter** ($7/month) or **Free** (with limitations)

### 4.3 Add Environment Variables

Click "Advanced" → "Add Environment Variable" and add each:

**Required Variables:**

```env
NODE_ENV=production

# Database (from PlanetScale)
DATABASE_URL=mysql://username:password@aws.connect.psdb.cloud/grade7-quiz-app?ssl={"rejectUnauthorized":true}

# JWT Secret (use the one you generated)
JWT_SECRET=8dbafcf47a2f79b4fe639332fdcfefaba160e257789f9bbcd48a91df51f42f3d

# Manus OAuth (get from Manus platform)
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
VITE_APP_ID=your-manus-app-id
OWNER_OPEN_ID=your-manus-open-id
OWNER_NAME=Your Name

# Built-in Forge API (for AI features)
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=your-forge-api-key
VITE_FRONTEND_FORGE_API_KEY=your-frontend-forge-key

# Application Branding
VITE_APP_TITLE=ICSE Grade 7 Quiz Master
VITE_APP_LOGO=https://your-logo-url.com/logo.png
```

**Optional Variables:**

```env
# Google TTS (optional)
GOOGLE_TTS_API_KEY=your-google-tts-api-key

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=your-analytics-endpoint
VITE_ANALYTICS_WEBSITE_ID=your-website-id
```

### 4.4 Deploy

1. Click "Create Web Service"
2. Render will start building and deploying
3. Wait 5-10 minutes for first deployment
4. You'll get a URL like: `https://grade7-quiz-app.onrender.com`

### 4.5 Run Database Migrations

After deployment, you need to create the database tables:

**Option 1: Using Render Shell**

1. In Render dashboard, go to your service
2. Click "Shell" tab
3. Run: `pnpm db:push`
4. Confirm all tables are created

**Option 2: Using Local Connection**

```bash
# Set DATABASE_URL to PlanetScale connection
export DATABASE_URL="mysql://username:password@aws.connect.psdb.cloud/grade7-quiz-app?ssl={\"rejectUnauthorized\":true}"

# Run migrations
pnpm db:push
```

### 4.6 Verify Deployment

1. Visit your Render URL: `https://grade7-quiz-app.onrender.com`
2. You should see the login page
3. Try logging in with test accounts
4. Check that everything works

---

## Phase 5: Custom Domain (GoDaddy)

### 5.1 Get Render Domain Info

1. In Render dashboard, go to your service
2. Click "Settings" → "Custom Domains"
3. Click "Add Custom Domain"
4. Enter your domain: `quizmaster.yourdomain.com` (or `yourdomain.com`)
5. Render will show you DNS records to add

Example:
```
Type: CNAME
Name: quizmaster (or @)
Value: grade7-quiz-app.onrender.com
```

### 5.2 Configure GoDaddy DNS

1. Go to https://dnsmanagement.godaddy.com
2. Find your domain and click "DNS"
3. Add new record:
   - **Type:** CNAME
   - **Name:** `quizmaster` (or `@` for root domain)
   - **Value:** `grade7-quiz-app.onrender.com`
   - **TTL:** 600 seconds (10 minutes)
4. Click "Save"

**For Root Domain (@):**

If you want to use `yourdomain.com` instead of `quizmaster.yourdomain.com`:

1. GoDaddy doesn't allow CNAME for root domain
2. Use **A Record** instead:
   - Get Render's IP address from their docs
   - Or use a subdomain (recommended)

### 5.3 Wait for DNS Propagation

- DNS changes take 10 minutes to 48 hours
- Usually propagates in 10-30 minutes
- Check status: https://dnschecker.org/

### 5.4 Enable HTTPS

1. In Render, go to your service → Settings → Custom Domains
2. Once DNS is verified, Render automatically provisions SSL certificate
3. Your site will be available at: `https://quizmaster.yourdomain.com`

---

## Phase 6: Post-Deployment

### 6.1 Update OAuth Callback URLs

1. Go to Manus OAuth settings
2. Add your production URL to allowed callbacks:
   - `https://quizmaster.yourdomain.com/api/oauth/callback`
   - `https://grade7-quiz-app.onrender.com/api/oauth/callback`

### 6.2 Upload Questions

1. Login as QB Admin: `qbadmin` / `admin123`
2. Go to Question Bank
3. Upload your question JSON files

### 6.3 Create Production Accounts

1. Have parents sign up via OAuth
2. Create child accounts for students
3. Test the full flow

### 6.4 Monitor Application

**Render Dashboard:**
- View logs in real-time
- Monitor CPU/Memory usage
- Check deployment history
- Set up alerts

**PlanetScale Dashboard:**
- Monitor database queries
- Check connection count
- View slow queries
- Set up backups

---

## Troubleshooting

### Build Fails on Render

**Error:** Out of memory during build

**Solution:**
1. Upgrade to Starter plan ($7/month) for more memory
2. Or split build into smaller chunks
3. Or use Docker deployment

### Database Connection Fails

**Error:** `ECONNREFUSED` or `Access denied`

**Solution:**
1. Verify DATABASE_URL is correct
2. Check PlanetScale connection string includes SSL parameter
3. Ensure PlanetScale database is in "main" branch
4. Check IP whitelist (PlanetScale allows all by default)

### OAuth Login Doesn't Work

**Error:** Redirect loop or "Invalid callback"

**Solution:**
1. Add production URL to Manus OAuth allowed callbacks
2. Verify OAUTH_SERVER_URL and VITE_OAUTH_PORTAL_URL are correct
3. Check VITE_APP_ID matches your Manus application
4. Clear browser cookies and try again

### Custom Domain Not Working

**Error:** DNS_PROBE_FINISHED_NXDOMAIN

**Solution:**
1. Wait longer for DNS propagation (up to 48 hours)
2. Verify CNAME record is correct in GoDaddy
3. Use `dig quizmaster.yourdomain.com` to check DNS
4. Try incognito mode or different browser

### Application Crashes

**Error:** Service keeps restarting

**Solution:**
1. Check Render logs for error messages
2. Verify all required environment variables are set
3. Check database connection is working
4. Ensure port binding is correct (Render sets PORT automatically)

---

## Maintenance

### Updating the Application

```bash
# Make changes locally
git add .
git commit -m "Update: description of changes"
git push origin main

# Render auto-deploys on push
# Or manually trigger deploy in Render dashboard
```

### Database Backups

**PlanetScale:**
- Automatic daily backups on paid plans
- Manual backup: Export via PlanetScale CLI
- Restore: Use PlanetScale dashboard

**Manual Backup:**
```bash
# Export database
pscale database dump grade7-quiz-app main --output backup.sql

# Import database
pscale database restore-dump grade7-quiz-app main --dir backup.sql
```

### Scaling

**Render:**
- Upgrade plan for more resources
- Enable auto-scaling (paid plans)
- Add horizontal scaling (multiple instances)

**PlanetScale:**
- Upgrade to Scaler plan for more connections
- Enable read replicas for better performance
- Monitor query performance and add indexes

---

## Cost Estimate

**Free Tier (Testing):**
- Render: Free (with limitations: sleeps after inactivity)
- PlanetScale: Free Hobby plan (1 database, 5GB storage)
- GoDaddy: Domain cost only (~$12/year)
- **Total:** ~$12/year

**Production (Recommended):**
- Render Starter: $7/month
- PlanetScale Hobby: Free
- GoDaddy: ~$12/year
- **Total:** ~$84/year + domain

**High Traffic:**
- Render Pro: $25/month
- PlanetScale Scaler: $39/month
- GoDaddy: ~$12/year
- **Total:** ~$768/year + domain

---

## Security Checklist

- [ ] All environment variables are set in Render (not in code)
- [ ] JWT_SECRET is strong and random
- [ ] Database uses SSL connection
- [ ] HTTPS is enabled (Render does this automatically)
- [ ] OAuth callbacks are restricted to your domain
- [ ] API keys are not exposed in client code
- [ ] .env file is in .gitignore
- [ ] GitHub repository is private (recommended)
- [ ] Regular database backups are configured
- [ ] Monitoring and alerts are set up

---

## Next Steps

1. ✅ Deploy to production
2. ✅ Configure custom domain
3. ✅ Upload real questions
4. ✅ Create production accounts
5. ✅ Test all features
6. ✅ Monitor performance
7. ✅ Set up backups
8. ✅ Configure alerts

---

## Support

**Render:** https://render.com/docs  
**PlanetScale:** https://planetscale.com/docs  
**GoDaddy:** https://www.godaddy.com/help  

---

**Deployment Status:** Ready for Production ✅  
**Estimated Setup Time:** 1-2 hours  
**Difficulty:** Intermediate

