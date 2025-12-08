-- Assign Admin role to hajime.hirose@alphaus.cloud
-- Run this AFTER creating the database schema
-- Make sure you've logged in at least once with Google OAuth first

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

-- Verify the role was assigned
SELECT * FROM user_roles WHERE user_email = 'hajime.hirose@alphaus.cloud';

