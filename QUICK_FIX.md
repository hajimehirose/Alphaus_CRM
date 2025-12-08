# Quick Fix Guide

## Step 1: Check Your Status

Visit this URL to see what's wrong:
```
https://my-lyc5i8oe6-hajime-s-projects.vercel.app/api/debug
```

This will tell you:
- ✅ If you have a role assigned
- ✅ How many customers are in the database
- ✅ If there are any errors

## Step 2: Assign Admin Role (if needed)

If the debug endpoint shows `role: null`, run this SQL in Supabase:

1. Go to: https://supabase.com/dashboard/project/nihagqfbxxztuanoebrw/sql/new
2. Paste and run:

```sql
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

3. Log out and log back in to refresh your session

## Step 3: Create Storage Bucket for Import (for the 500 error)

The import feature needs a Storage bucket:

1. Go to: https://supabase.com/dashboard/project/nihagqfbxxztuanoebrw/storage/buckets
2. Click **"New bucket"**
3. Name: `imports`
4. Make it **Private** (not public)
5. Click **"Create bucket"**

## Step 4: Check if Customers Exist

1. Go to: https://supabase.com/dashboard/project/nihagqfbxxztuanoebrw/editor
2. Click on the `customers` table
3. Check if there are any rows

If the table is empty, you can:
- Create customers manually via the app (click "Add Customer")
- Import from CSV (after creating the Storage bucket)
- Or import existing data if you have it

---

## Quick Checklist

- [ ] Visit `/api/debug` to check your status
- [ ] If no role, assign Admin role using SQL
- [ ] Log out and log back in
- [ ] Create `imports` Storage bucket in Supabase
- [ ] Check if customers table has data
- [ ] Test the app again

