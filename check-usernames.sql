-- Check for usernames that contain uppercase letters
SELECT id, username, name, role 
FROM users 
WHERE username != LOWER(username)
LIMIT 20;
