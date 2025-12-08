# Troubleshooting Guide

## Issue 1: "No customers found"

This usually means one of three things:

### Check 1: Do you have a role assigned?

1. Visit: `https://my-lyc5i8oe6-hajime-s-projects.vercel.app/api/debug`
2. Check the response:
   - If `role: null`, you don't have a role assigned
   - If `role: "Admin"` or `"Manager"`, you should see all customers
   - If `role: "Sales"`, you'll only see customers where `alphaus_rep` matches your email

### Solution: Assign Admin Role

Run this SQL in Supabase SQL Editor:

```sql
-- Assign Admin role to hajime.hirose@alphaus.cloud
INSERT INTO user_roles (user_id, user_email, role, assigned_by, assigned_at)
SELECT 
  au.id,
  'hajime.hirose@alphaus.cloud',
  'Admin',
  'system',
  NOW()
FROM auth.users au
WHERE au.email = 'hajime.hirose@alphaus.cloud'
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'Admin',
  user_email = 'hajime.hirose@alphaus.cloud',
  assigned_at = NOW();
```

### Check 2: Are there customers in the database?

1. Go to Supabase Dashboard → Table Editor → `customers` table
2. Check if there are any rows
3. If empty, you need to import data or create customers manually

### Check 3: Are you logged out and logged back in?

After assigning a role, you may need to:
1. Log out
2. Log back in
3. Clear browser cache (optional)

---

## Issue 2: 500 Error on `/api/import/upload`

This error usually means:

### Check 1: Environment Variables Missing

1. Visit: `https://my-lyc5i8oe6-hajime-s-projects.vercel.app/api/health`
2. Check if all environment variables are set:
   - `NEXT_PUBLIC_SUPABASE_URL` - should be set
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - should be set
   - `SUPABASE_SERVICE_ROLE_KEY` - should be set

### Check 2: Supabase Storage Bucket Missing

The import feature needs a Storage bucket. Create it:

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name it: `imports`
4. Make it **Private** (not public)
5. Click "Create bucket"

### Check 3: Storage Policies

After creating the bucket, you may need to set up RLS policies:

1. Go to Storage → `imports` bucket → Policies
2. Add a policy that allows authenticated users to upload files

---

## Quick Diagnostic Commands

### Check your role:
```bash
# Visit in browser:
https://my-lyc5i8oe6-hajime-s-projects.vercel.app/api/debug
```

### Check environment variables:
```bash
# Visit in browser:
https://my-lyc5i8oe6-hajime-s-projects.vercel.app/api/health
```

### Check customer count:
```sql
-- Run in Supabase SQL Editor:
SELECT COUNT(*) FROM customers;
```

### Check your role:
```sql
-- Run in Supabase SQL Editor:
SELECT * FROM user_roles WHERE user_email = 'hajime.hirose@alphaus.cloud';
```

---

## Step-by-Step Fix

1. **Check if you have a role:**
   - Visit `/api/debug` endpoint
   - If role is null, assign Admin role using SQL above

2. **Check environment variables:**
   - Visit `/api/health` endpoint
   - If variables are missing, add them in Vercel Settings

3. **Check if customers exist:**
   - Check Supabase Table Editor for `customers` table
   - If empty, create a test customer or import data

4. **Fix import feature:**
   - Create `imports` Storage bucket in Supabase
   - Set up Storage policies if needed

5. **Test again:**
   - Log out and log back in
   - Try viewing customers
   - Try importing (after bucket is created)

