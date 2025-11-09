# Setup Guide: Free Tier Image APIs

## Quick Start (15 minutes)

This guide will help you set up **100% free** image APIs for educational content enhancement.

---

## 🎯 What You'll Get

- ✅ **Unlimited images** from Pexels (with attribution)
- ✅ **Unlimited images** from Pixabay (no attribution needed!)
- ✅ **Unlimited images** from Wikimedia Commons
- ✅ **1,200+ images/day** from Unsplash (50/hour)
- ✅ **Zero cost** - all free forever

**Total capacity: Effectively unlimited for your use case**

---

## 📋 Setup Steps

### 1. Pexels API (5 minutes) ⭐ **PRIORITY**

**Why:** Unlimited free images with attribution

**Steps:**
1. Go to https://www.pexels.com/api/
2. Click "Get Started"
3. Create account (free)
4. Copy your API key
5. Add to `.env`:
   ```bash
   PEXELS_API_KEY=your_api_key_here
   ```

**Rate Limits:**
- Default: 200/hour, 20,000/month
- **Unlimited available**: Email api@pexels.com with:
  ```
  Subject: Request for Unlimited API Access
  
  Hi Pexels team,
  
  I'm building an educational platform (Brahmai) for Grade 7 students.
  We use Pexels images to enhance learning explanations.
  
  We provide attribution: "Photo by [Photographer] from Pexels"
  
  Could you please remove rate limits on our API key?
  
  API Key: [your_key]
  Website: [your_domain]
  
  Thank you!
  ```

**Attribution:** Required (automatically added by our code)

---

### 2. Pixabay API (3 minutes) ⭐ **PRIORITY**

**Why:** Unlimited free images, NO attribution required

**Steps:**
1. Go to https://pixabay.com/api/docs/
2. Click "Get Started"
3. Create account (free)
4. Copy your API key
5. Add to `.env`:
   ```bash
   PIXABAY_API_KEY=your_api_key_here
   ```

**Rate Limits:**
- **NONE** - truly unlimited!

**Attribution:** NOT required (CC0 license)

---

### 3. Unsplash API (5 minutes)

**Why:** High-quality images, 50/hour free

**Steps:**
1. Go to https://unsplash.com/developers
2. Click "Register as a developer"
3. Create account (free)
4. Create new application:
   - Name: "Brahmai Educational Platform"
   - Description: "Educational image enhancement for Grade 7 students"
   - Accept terms
5. Copy "Access Key"
6. Add to `.env`:
   ```bash
   UNSPLASH_ACCESS_KEY=your_access_key_here
   ```

**Rate Limits:**
- Demo: 50 requests/hour (1,200/day)
- Production: 5,000/hour (requires approval)

**Attribution:** Required (automatically added by our code)

**Optional - Request Production Access:**
- After testing, submit for production tier
- Fill out application form
- Usually approved within 1-2 days
- Increases limit to 5,000/hour

---

### 4. Wikimedia Commons (0 minutes) ✅

**Why:** Free educational diagrams, no API key needed

**Steps:**
- Nothing! Already integrated
- No API key required
- No rate limits

**Attribution:** Automatically added by our code

---

## 🔧 Environment Variables

Add these to your `.env` file:

```bash
# Image APIs (All FREE)
PEXELS_API_KEY=your_pexels_key_here
PIXABAY_API_KEY=your_pixabay_key_here
UNSPLASH_ACCESS_KEY=your_unsplash_key_here

# Note: Wikimedia doesn't need a key
```

---

## ✅ Verification

### Test the Setup

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Check logs for:**
   ```
   [Educational Images] Analyzing question...
   [Educational Images] Searching for: "energy transformation"
   [Educational Images] Found on Pexels
   [Educational Images] Downloaded and saved: /educational-images/q123_img1_abc123.jpg
   [Educational Images] Enhanced with 2 images
   ```

3. **Test in browser:**
   - Complete a quiz
   - Click "Get Detailed Explanation"
   - Look for images in the explanation
   - Verify attribution text appears

### Expected Behavior

**With API Keys:**
- Images appear in explanations
- Attribution text shows below images
- Server logs show successful searches

**Without API Keys:**
- Explanations work normally (text-only)
- Server logs show: "No [Provider] API key"
- No errors, graceful degradation

---

## 📊 Usage Monitoring

### Check Your Usage

**Pexels:**
- Dashboard: https://www.pexels.com/api/
- Shows requests per hour/month

**Pixabay:**
- No dashboard (unlimited anyway)

**Unsplash:**
- Dashboard: https://unsplash.com/oauth/applications
- Shows hourly usage

**Wikimedia:**
- No tracking needed (unlimited)

### Expected Usage

For **100 explanations/day**:
- ~200 images/day
- ~6,000 images/month
- **Cost: $0**

All within free tiers! ✅

---

## 🎨 Image Attribution

Our code automatically adds attribution where required:

**Pexels:**
```
Photo by John Doe from Pexels
```

**Unsplash:**
```
Photo by Jane Smith on Unsplash
```

**Pixabay:**
```
(No attribution - CC0 license)
```

**Wikimedia:**
```
From Wikimedia Commons
```

---

## 🚀 Optimization Tips

### 1. Request Production Access (Unsplash)

After 1-2 weeks of usage:
1. Go to https://unsplash.com/oauth/applications
2. Click your app
3. Click "Request Production"
4. Fill out form (explain educational use)
5. Wait 1-2 days for approval
6. Get 5,000 requests/hour (120,000/day!)

### 2. Request Unlimited Access (Pexels)

Email api@pexels.com:
- Show your attribution implementation
- Explain educational use case
- Get unlimited requests for free

### 3. Monitor Usage

Check dashboards weekly:
- Ensure you're within limits
- Identify any issues early
- Optimize search queries if needed

---

## ❓ Troubleshooting

### Images Not Appearing

**Check 1: API Keys**
```bash
# Verify .env file has keys
cat .env | grep _API_KEY
```

**Check 2: Server Logs**
```bash
# Look for errors
grep "Educational Images" /tmp/server.log
```

**Check 3: Network**
```bash
# Test API connectivity
curl -H "Authorization: YOUR_PEXELS_KEY" \
  "https://api.pexels.com/v1/search?query=energy&per_page=1"
```

### Rate Limit Errors

**Pexels:**
- Default: 200/hour, 20K/month
- Solution: Request unlimited access (free)

**Unsplash:**
- Demo: 50/hour
- Solution: Request production tier (free)

**Pixabay/Wikimedia:**
- No limits!

### Image Quality Issues

**Problem:** Images not relevant

**Solution:** Improve search queries
- Edit `analyzeAndSuggestImages()` prompt
- Make queries more specific
- Test with different subjects

**Problem:** Low-quality images

**Solution:** Adjust provider priority
- Pexels/Unsplash: High quality
- Pixabay: Mixed quality
- Wikimedia: Educational focus

---

## 📈 Scaling

### Current Capacity (Free Tier)

| Provider | Limit | Monthly Capacity |
|----------|-------|------------------|
| Pexels | 20K/month (removable) | Unlimited* |
| Pixabay | Unlimited | Unlimited |
| Wikimedia | Unlimited | Unlimited |
| Unsplash | 50/hour | 36,000/month |
| **Total** | - | **Effectively Unlimited** |

*Request unlimited access from Pexels (free)

### If You Outgrow Free Tier

**Unlikely scenario** (would need 100K+ explanations/month)

**Option 1:** Use only Pixabay + Wikimedia (truly unlimited)

**Option 2:** Add paid tier
- SerpAPI: $75/month for 5,000 searches
- Google Custom Search: $5 per 1,000 queries

**But with current free tiers, you can serve millions of explanations/year for $0.**

---

## 🎓 Best Practices

### 1. Respect Rate Limits
- Don't spam requests
- Cache images locally
- Reuse cached images

### 2. Provide Attribution
- Always show attribution for Pexels/Unsplash
- It's required by their terms
- It's the right thing to do

### 3. Monitor Usage
- Check dashboards weekly
- Watch for unusual spikes
- Optimize if needed

### 4. Optimize Search Queries
- Use simple, clear terms
- Avoid overly specific queries
- Test with real questions

---

## 📞 Support Contacts

**Pexels:**
- Email: api@pexels.com
- For: Unlimited access requests

**Unsplash:**
- Email: api@unsplash.com
- For: Production tier approval

**Pixabay:**
- Email: support@pixabay.com
- For: General questions

**Wikimedia:**
- No support needed (unlimited, no key)

---

## ✅ Checklist

- [ ] Signed up for Pexels API
- [ ] Signed up for Pixabay API
- [ ] Signed up for Unsplash API
- [ ] Added API keys to `.env`
- [ ] Restarted server
- [ ] Tested with sample explanation
- [ ] Verified images appear
- [ ] Verified attribution shows
- [ ] (Optional) Requested Pexels unlimited access
- [ ] (Optional) Requested Unsplash production tier

---

## 🎉 You're Done!

Your educational platform now has:
- ✅ Unlimited free images
- ✅ High-quality content
- ✅ Proper attribution
- ✅ Zero cost

**Total setup time: 15 minutes**  
**Total cost: $0/month**  
**Capacity: Effectively unlimited**

Enjoy! 🚀
