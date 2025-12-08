# Supabase Redirect URL Configuration

## The Problem

You're being redirected to `https://production.webapp-5wr.pages.dev/login` after login because this URL is configured in your Supabase OAuth settings.

## The Solution

Update your Supabase redirect URLs to point to your Vercel production URL.

### Step 1: Go to Supabase Dashboard

1. Visit: https://supabase.com/dashboard/project/nihagqfbxxztuanoebrw
2. Navigate to **Authentication** → **URL Configuration**

### Step 2: Update Site URL

Set the **Site URL** to:
```
https://my-lyc5i8oe6-hajime-s-projects.vercel.app
```

### Step 3: Update Redirect URLs

In the **Redirect URLs** section, add:
```
https://my-lyc5i8oe6-hajime-s-projects.vercel.app/auth/callback
```

**Important:** You can have multiple redirect URLs. Make sure to:
- Add your Vercel production URL
- Remove or keep the old Cloudflare Pages URL (if you're not using it)
- Keep `http://localhost:3000/auth/callback` for local development

### Step 4: Save Changes

Click **Save** at the bottom of the page.

## Complete Redirect URL List

For a complete setup, you should have:

```
https://my-lyc5i8oe6-hajime-s-projects.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

(Remove the Cloudflare Pages URL if you're not using it anymore)

## Verification

After updating:
1. Go to your Vercel app: `https://my-lyc5i8oe6-hajime-s-projects.vercel.app`
2. Try logging in with Google
3. You should be redirected back to your Vercel app, not the Cloudflare Pages URL

## Important Notes

- Changes to redirect URLs take effect immediately
- Make sure your Vercel URL matches exactly (including `https://`)
- The `/auth/callback` path is required - this is where Supabase sends users after OAuth
- If you have multiple environments (staging, production), add redirect URLs for each

