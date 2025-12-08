# Admin Role Assignment Guide

## Option 1: Using SQL Script (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/nihagqfbxxztuanoebrw
2. Navigate to **SQL Editor**
3. Copy and paste this SQL:

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

4. Click **Run**
5. Verify by running:
```sql
SELECT * FROM user_roles WHERE user_email = 'hajime.hirose@alphaus.cloud';
```

## Option 2: Using API Endpoint

1. Make sure your dev server is running: `npm run dev`
2. Run this command:

```bash
curl -X POST http://localhost:3000/api/admin/assign-role \
  -H "Content-Type: application/json" \
  -d '{"email": "hajime.hirose@alphaus.cloud", "role": "Admin"}'
```

Or use the provided script:
```bash
./assign-admin.sh
```

## Option 3: Manual Insert (If user_id is known)

1. First, get the user_id from Supabase:
   - Go to **Authentication** > **Users**
   - Find `hajime.hirose@alphaus.cloud`
   - Copy the User UID

2. Run this SQL (replace `YOUR_USER_ID` with the actual ID):

```sql
INSERT INTO user_roles (user_id, user_email, role, assigned_by, assigned_at)
VALUES (
  'YOUR_USER_ID',
  'hajime.hirose@alphaus.cloud',
  'Admin',
  'system',
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET role = 'Admin';
```

## Important Notes

- The user must have logged in at least once via Google OAuth for their account to exist in `auth.users`
- After assigning the role, the user may need to log out and log back in for the changes to take effect
- The Admin role grants full access to all features including user management

## Troubleshooting

If you get "User not found":
1. Make sure the user has logged in at least once
2. Check the email spelling in Supabase Auth > Users
3. The email must match exactly (case-sensitive in some cases)

If the role doesn't take effect:
1. Log out and log back in
2. Clear browser cache/cookies
3. Check browser console for errors

