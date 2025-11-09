# Educational Images Feature

## Overview

This feature automatically enhances detailed explanations with relevant educational images to make learning more visual, engaging, and easier to understand for students.

## How It Works

### 1. Image Analysis
When a detailed explanation is generated, the system:
- Analyzes the question, answer, subject, and topic
- Uses AI to determine if visual aids would be helpful
- Suggests 1-2 relevant images with search queries

### 2. Image Acquisition (Hybrid Approach)
The system uses a hybrid approach to get images:

**Option A: Search for Existing Images (Preferred)**
- Searches for educational images using Bing Image Search API
- Looks for diagrams, illustrations, and educational photos
- Downloads and saves images locally
- Only uses public domain/creative commons images

**Option B: Generate Custom Images (Fallback)**
- If search fails or no API key is available
- Can be extended to use AI image generation
- Currently disabled to avoid delays

### 3. Image Integration
- Images are inserted at strategic positions in the explanation
- Styled with proper formatting and captions
- Responsive design for all devices

## Setup Requirements

### Bing Image Search API (Optional but Recommended)

To enable image search, you need a Bing Search API key:

1. Go to [Azure Portal](https://portal.azure.com/)
2. Create a "Bing Search v7" resource
3. Copy the API key
4. Add to your `.env` file:
   ```
   BING_SEARCH_API_KEY=your_api_key_here
   ```

**Without API Key:**
- Feature will still work but won't add images
- Explanations will be text-only (current behavior)
- No errors, gracefully degrades

## File Structure

```
server/
├── educational-images.ts          # Main image enhancement logic
├── db.ts                          # Updated to call image enhancement
└── ...

public/
└── educational-images/            # Downloaded images stored here
    ├── q123_img1_abc123.jpg
    └── ...
```

## Implementation Details

### Key Functions

**`analyzeAndSuggestImages()`**
- Analyzes question and explanation
- Returns image suggestions with search queries
- Uses AI to determine relevance

**`searchEducationalImages()`**
- Searches Bing for educational images
- Filters for safe, public domain images
- Returns top 3 results

**`downloadAndSaveImage()`**
- Downloads images from URLs
- Saves to `/public/educational-images/`
- Returns local path for serving

**`insertImagesIntoExplanation()`**
- Inserts images at strategic positions
- Adds proper HTML/CSS styling
- Includes captions

### Image Positions

- `after_intro`: After the first section (usually "Why the Answer is...")
- `after_example`: After the "Real-Life Example" section
- `end`: At the end of the explanation

## Performance Considerations

### Caching
- Enhanced explanations (with images) are cached in database
- Subsequent requests serve cached version instantly
- No re-downloading or re-processing

### Non-Blocking
- Image enhancement is non-blocking
- If it fails, explanation still returns (text-only)
- Errors are logged but don't break the flow

### Timeouts
- Image search: 5 second timeout
- Image download: 10 second timeout
- Total overhead: ~2-5 seconds for first generation

## Testing

### Manual Test
1. Start the dev server: `npm run dev`
2. Login and complete a quiz
3. Click "Get Detailed Explanation" on any question
4. Check if images appear in the explanation

### With API Key
- Images should appear for most science/physics questions
- Check browser console for image URLs
- Verify images are saved in `/public/educational-images/`

### Without API Key
- Explanations should work normally (text-only)
- No errors in console
- Feature gracefully degrades

## Future Enhancements

### Potential Improvements
1. **AI Image Generation Fallback**
   - Generate custom diagrams when search fails
   - Use tools like DALL-E or Stable Diffusion

2. **Image Quality Scoring**
   - Analyze downloaded images for quality
   - Reject blurry or irrelevant images
   - Retry with different search queries

3. **Diagram Generation**
   - Use Mermaid for flowcharts and diagrams
   - Generate custom visualizations for processes
   - Better for abstract concepts

4. **Image Moderation**
   - Additional safety checks
   - Content appropriateness verification
   - Age-appropriate filtering

5. **Performance Optimization**
   - Pre-generate images for common questions
   - CDN integration for faster loading
   - Image compression and optimization

## Configuration

### Environment Variables

```bash
# Optional: Bing Image Search API
BING_SEARCH_API_KEY=your_key_here

# Optional: Image generation settings
MAX_IMAGES_PER_EXPLANATION=2
IMAGE_SEARCH_TIMEOUT=5000
IMAGE_DOWNLOAD_TIMEOUT=10000
```

### Feature Toggle

To disable the feature temporarily:

```typescript
// In server/db.ts, comment out the image enhancement block:
/*
try {
  const { enhanceExplanationWithImages } = await import('./educational-images');
  // ... rest of the code
} catch (imageError) {
  // ...
}
*/
```

## Troubleshooting

### Images Not Appearing
1. Check if `BING_SEARCH_API_KEY` is set
2. Check server logs for errors
3. Verify `/public/educational-images/` directory exists
4. Check browser console for image loading errors

### Slow Performance
1. Check network connectivity
2. Verify API key is valid
3. Consider reducing `MAX_IMAGES_PER_EXPLANATION`
4. Check if images are being cached properly

### Image Quality Issues
1. Improve search queries in AI prompts
2. Add quality filtering logic
3. Consider using different image sources
4. Implement fallback to AI generation

## License & Attribution

- Images are sourced from public domain/creative commons
- Bing Image Search respects license filters
- Attribution may be required for some images
- Check individual image licenses

## Support

For issues or questions:
1. Check server logs for errors
2. Verify environment variables
3. Test with and without API key
4. Review browser console for client-side errors
