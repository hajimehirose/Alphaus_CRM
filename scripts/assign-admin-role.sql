-- Assign Admin role to hajime.hirose@alphaus.cloud
-- Run this in Supabase SQL Editor

-- First, find the user_id from auth.users
-- If you know the user_id, you can use it directly, otherwise use email to look it up

-- Option 1: Insert or update using email lookup (if user_roles has email column)
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

-- Option 2: If the above doesn't work, get the user_id first:
-- SELECT id, email FROM auth.users WHERE email = 'hajime.hirose@alphaus.cloud';
-- Then use that id in the INSERT statement below:

-- INSERT INTO user_roles (user_id, user_email, role, assigned_by, assigned_at)
-- VALUES (
--   'paste-user-id-here',
--   'hajime.hirose@alphaus.cloud',
--   'Admin',
--   'system',
--   NOW()
-- )
-- ON CONFLICT (user_id) DO UPDATE SET role = 'Admin';

-- Verify the role was assigned:
-- SELECT * FROM user_roles WHERE user_email = 'hajime.hirose@alphaus.cloud';

