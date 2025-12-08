# Vercel Environment Variables Setup

## 🚨 Quick Check

Visit `/api/health` on your production site to check if environment variables are set:
- Production URL: `https://your-site.vercel.app/api/health`
- This will tell you exactly which variables are missing

## Required Environment Variables

Add these environment variables in your Vercel project settings:

### 1. Go to Vercel Project Settings
Visit: https://vercel.com/hajime-s-projects/my-crm/settings/environment-variables

(Replace `my-crm` with your actual project name if different)

### 2. Add the following variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nihagqfbxxztuanoebrw.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5paGFncWZieHh6dHVhbm9lYnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODcxMTAsImV4cCI6MjA4MDI2MzExMH0.UDh_hxOlxHP0ru6lsM8LXC776491uHBRCi1kVKEMSq0` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5paGFncWZieHh6dHVhbm9lYnJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDY4NzExMCwiZXhwIjoyMDgwMjYzMTEwfQ.MMVLHaqDQILabVbqRcfVbLaS6TFzWslzoYC8_ZZSPCI` | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | Your Vercel production URL (e.g., `https://my-crm.vercel.app`) | Production, Preview |

## Step-by-Step Instructions

### Option 1: Via Vercel Dashboard

1. Go to your Vercel project: https://vercel.com/hajime-s-projects
2. Select your project (`my-crm` or similar)
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add each variable:
   - Variable Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://nihagqfbxxztuanoebrw.supabase.co`
   - Environment: Select **Production**, **Preview**, and **Development**
   - Click **Save**
6. Repeat for all 4 variables above

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login
vercel login

# Link your project (if not already linked)
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Enter: https://nihagqfbxxztuanoebrw.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Enter: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5paGFncWZieHh6dHVhbm9lYnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODcxMTAsImV4cCI6MjA4MDI2MzExMH0.UDh_hxOlxHP0ru6lsM8LXC776491uHBRCi1kVKEMSq0

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Enter: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5paGFncWZieHh6dHVhbm9lYnJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDY4NzExMCwiZXhwIjoyMDgwMjYzMTEwfQ.MMVLHaqDQILabVbqRcfVbLaS6TFzWslzoYC8_ZZSPCI

vercel env add NEXT_PUBLIC_APP_URL production
# Enter your Vercel production URL
```

## After Adding Variables

1. **Redeploy your application:**
   - Go to **Deployments** tab in Vercel
   - Click the **⋯** (three dots) on the latest deployment
   - Click **Redeploy**
   - Or push a new commit to trigger a new deployment

2. **Verify:**
   - Wait for deployment to complete
   - Visit your production URL
   - Check browser console - errors should be gone
   - You should see your customer data

## Important Notes

- ⚠️ **Service Role Key is sensitive** - Never commit it to git or expose it publicly
- ✅ **Anon Key is safe** - It's meant for client-side use (that's why it's `NEXT_PUBLIC_`)
- 🔄 Environment variables are cached - You may need to redeploy after adding them
- 🌍 Make sure to add variables to **all environments** (Production, Preview, Development) you plan to use

## Finding Your Vercel URL

If you need to find your production URL:
1. Go to Vercel Dashboard → Your Project → **Deployments**
2. Your production URL will be shown (e.g., `my-crm-abc123.vercel.app`)
3. Use this for `NEXT_PUBLIC_APP_URL`

## Troubleshooting

If you still see errors after adding variables:

1. **Clear browser cache** and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. **Check deployment logs** in Vercel to see if variables are being read
3. **Verify variable names** - They must match exactly (case-sensitive)
4. **Redeploy** - Sometimes a redeploy is needed for env vars to take effect

