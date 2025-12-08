# How to Find Your Vercel Production URL

## Step-by-Step Guide

### Method 1: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/hajime-s-projects
   - Or: https://vercel.com/dashboard

2. **Find Your Project:**
   - Look for your project (likely named "Alphaus_CRM" or similar)
   - Click on the project name

3. **Get Your Production URL:**
   - On the project page, you'll see the deployment URLs at the top
   - Your production URL will be shown, typically in format:
     - `https://alphaus-crm-[random-hash].vercel.app`
     - Or: `https://your-project-name.vercel.app` (if you have a custom domain)

4. **Check Deployments:**
   - Click on the **Deployments** tab
   - Look for the deployment with a green checkmark (✓) that says "Production"
   - Click on it to see the deployment details
   - The URL will be shown at the top

### Method 2: Via Vercel CLI

```bash
# If you have Vercel CLI installed
cd /Users/hajimehirose/Desktop/MyCRM
npx vercel ls
```

This will list all your deployments with their URLs.

### Method 3: Check Your Git Integration

1. Go to your project in Vercel
2. Check **Settings** → **Git**
3. The deployment URL pattern should be shown there

## Common Issues

### "DEPLOYMENT_NOT_FOUND" Error

This usually means:
- You're using an old/incorrect URL
- The deployment was deleted or hasn't been created yet
- You're trying to access a preview deployment URL that expired

### Solution:
1. Go to Vercel Dashboard → Your Project → **Deployments**
2. Find the latest successful deployment (green checkmark)
3. Copy the correct URL from there
4. Make sure it says "Production" not "Preview"

## After Finding Your URL

1. **Update Environment Variables:**
   - Use your production URL for `NEXT_PUBLIC_APP_URL`
   - Go to Settings → Environment Variables
   - Update `NEXT_PUBLIC_APP_URL` to match your actual production URL

2. **Configure Supabase Redirect URLs:**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your Vercel production URL:
     - Site URL: `https://your-production-url.vercel.app`
     - Redirect URLs: `https://your-production-url.vercel.app/auth/callback`

3. **Test:**
   - Visit: `https://your-production-url.vercel.app/api/health`
   - Should return status information

