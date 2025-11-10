-- Migration: Normalize all existing usernames to lowercase
-- This ensures case-insensitive login works for existing users

-- Step 1: Check for usernames that will be affected
SELECT 
  id, 
  username, 
  LOWER(username) as normalized_username,
  name, 
  role 
FROM users 
WHERE username != LOWER(username);

-- Step 2: Update all usernames to lowercase
UPDATE users 
SET username = LOWER(username)
WHERE username != LOWER(username);

-- Step 3: Verify the update
SELECT COUNT(*) as remaining_uppercase_usernames
FROM users 
WHERE username != LOWER(username);
-- Should return 0

-- Step 4: Show all usernames after normalization
SELECT id, username, name, role 
FROM users 
ORDER BY role, username
LIMIT 50;
