# Image Validation Fix - Testing Guide

**Date:** November 10, 2025  
**Commit:** c238baf  
**Status:** Deployed to Production

---

## What Was Fixed

### Problem
- Validation checked if **search query** matched question (not actual image)
- System stopped at first provider with ANY result (even if irrelevant)
- Irrelevant images approved (welding sparks for steam engine, circuit boards, etc.)

### Solution
1. **Actual Image Metadata Validation**
   - APIs now return actual image descriptions (alt text)
   - Validator checks ACTUAL image content vs question
   - Rejects images where description doesn't match concept

2. **Smart Multi-Provider Fallback**
   - Tries ALL providers (Pexels, Pixabay, Wikimedia, Unsplash)
   - Validates EACH result
   - Uses first RELEVANT image (not just first result)

---

## Testing Steps

### Step 1: Wait for Deployment (2-3 minutes)
Check Render dashboard: https://dashboard.render.com/web/srv-d449b6muk2gs73a23vq0

Look for deployment of commit `c238baf`

### Step 2: Clear Cache for Test Question

**Option A: Use PostgreSQL client**
```sql
-- Connect to database
psql "postgresql://neondb_owner:npg_Ki2cfdr3ETSY@ep-super-hall-a1obz0xf-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

-- Run the clear script
\i /path/to/clear-steam-engine-cache.sql
```

**Option B: Use Neon dashboard**
1. Go to https://console.neon.tech/
2. Select the database
3. Open SQL Editor
4. Paste and run:
```sql
DELETE FROM "aiExplanationCache" WHERE "questionId" = 515;
DELETE FROM "explanationVersions" WHERE "questionId" = 515;
```

### Step 3: Test Steam Engine Question (ID 515)

**Question:** "In a steam engine, the complete energy transformation sequence is:"  
**Answer:** Chemical → Heat → Mechanical

**Expected Behavior:**
1. System searches all providers
2. Logs show validation of each image with alt text
3. Irrelevant images rejected (welding, circuits, etc.)
4. Only relevant steam engine images approved
5. OR no images shown if none are relevant (better than wrong images!)

### Step 4: Check Logs

Go to Render logs and look for:
```
[Educational Images] Searching all providers for: "..."
[Educational Images] Found on Pexels
[Image Validation] Image alt text: "..."
[Image Validation] Result: NOT RELEVANT (confidence: X%) - ...
[Image Validation] ✗ Image REJECTED: ...
[Educational Images] Found on Pixabay
[Image Validation] Image alt text: "..."
[Image Validation] Result: RELEVANT (confidence: X%) - ...
[Image Validation] ✓ Image APPROVED and added
```

### Step 5: Verify in UI

1. Log in as a child account
2. Take a quiz with question 515
3. View detailed explanation
4. Check images:
   - ✅ Should show actual steam engine/locomotive
   - ✅ OR show no images at all
   - ❌ Should NOT show welding, circuits, or unrelated images

---

## Success Criteria

### ✅ Pass
- Logs show multiple providers being tried
- Logs show actual alt text from images
- Irrelevant images are rejected with clear reasons
- Only relevant images are approved
- UI shows relevant steam engine images OR no images

### ❌ Fail
- Still showing welding sparks or circuit boards
- Logs don't show alt text validation
- Only one provider is tried
- Generic images are approved

---

## Rollback Plan

If the fix doesn't work:

```bash
cd /home/ubuntu/Brahmai
git revert c238baf
git push origin main
```

This will revert to the previous validation logic.

---

## Additional Test Cases

After steam engine question works, test with:

1. **Hammer hitting nail question** (should reject Newton's cradle, light bulbs)
2. **Tennis ball bouncing** (should reject generic "energy" stock photos)
3. **Hydroelectric dam** (should reject generic water images)

For each:
1. Clear cache for that question
2. Generate new explanation
3. Check logs for validation process
4. Verify images are relevant

---

## Technical Details

### API Metadata Fields Used

**Pexels:**
```json
{
  "alt": "A nostalgic black and white image of a vintage steam locomotive..."
}
```

**Unsplash:**
```json
{
  "alt_description": "a black and white photo of a man driving a tractor",
  "description": "Optional longer description"
}
```

**Pixabay:**
```json
{
  "tags": "steam, engine, locomotive, train"
}
```

### Validation Flow

```
For each image suggestion:
  1. Search ALL providers (Pexels, Pixabay, Wikimedia, Unsplash)
  2. For each result:
     a. Extract alt text from API response
     b. Pass to AI validator with:
        - Question text
        - Correct answer
        - Search query (our intent)
        - Our caption
        - ACTUAL image alt text (what image really shows)
     c. AI checks if alt text matches question concept
     d. If RELEVANT (>=70% confidence): USE IT and stop
     e. If NOT RELEVANT: Try next provider
  3. If no relevant images found across all providers: Show no image
```

---

## Monitoring

After deployment, monitor for:
- Image approval rate (should decrease initially)
- Image relevance quality (should increase)
- Number of "no image" cases (may increase, which is OK)
- Student/teacher feedback on image quality

---

## Notes

- Better to show NO image than a WRONG/CONFUSING image
- This is a development phase - perfect time to be strict
- Can adjust confidence threshold (currently 70%) if needed
- Can add more providers if current ones don't have good educational content
