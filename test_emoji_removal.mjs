// Test emoji removal function

function markdownToPlainText(markdown) {
  let text = markdown;
  
  // Remove code blocks (``` or `)
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');
  
  // Remove headers (# ## ###)
  text = text.replace(/^#{1,6}\s+/gm, '');
  
  // Remove bold/italic (**text**, *text*, __text__, _text_)
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  
  // Remove links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove list markers (-, *, +, 1.)
  text = text.replace(/^[\s]*[-*+]\s+/gm, '');
  text = text.replace(/^[\s]*\d+\.\s+/gm, '');
  
  // Remove blockquotes (>)
  text = text.replace(/^>\s+/gm, '');
  
  // Remove horizontal rules (---, ***, ___)
  text = text.replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '');
  
  // Remove ALL emojis (comprehensive Unicode ranges)
  text = text.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
  text = text.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Symbols & Pictographs
  text = text.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport & Map
  text = text.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ''); // Flags
  text = text.replace(/[\u{2600}-\u{26FF}]/gu, '');   // Miscellaneous Symbols
  text = text.replace(/[\u{2700}-\u{27BF}]/gu, '');   // Dingbats
  text = text.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); // Supplemental Symbols
  text = text.replace(/[\u{1FA00}-\u{1FA6F}]/gu, ''); // Extended Symbols
  text = text.replace(/[\u{1FA70}-\u{1FAFF}]/gu, ''); // Extended Symbols 2
  text = text.replace(/[\u{FE00}-\u{FE0F}]/gu, '');   // Variation Selectors
  text = text.replace(/[\u{1F000}-\u{1F02F}]/gu, ''); // Mahjong Tiles
  text = text.replace(/[\u{1F0A0}-\u{1F0FF}]/gu, ''); // Playing Cards
  
  // Remove any remaining special characters that might be read aloud
  text = text.replace(/[★☆✓✔✗✘]/g, '');
  text = text.replace(/[←→↑↓]/g, '');
  
  // Clean up extra whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/\s{2,}/g, ' ');
  text = text.trim();
  
  return text;
}

// Test with sample text containing emojis
const testText = `# Heat Transfer 🔥

Heat transfers from hot to cold objects. 💡

**Key Points:**
- Conduction 🎯
- Convection ✨
- Radiation 📚

Great job! 😊👍`;

console.log('=== ORIGINAL TEXT ===');
console.log(testText);
console.log('\n=== CLEANED TEXT ===');
const cleaned = markdownToPlainText(testText);
console.log(cleaned);
console.log('\n=== STATS ===');
console.log('Original length:', testText.length);
console.log('Cleaned length:', cleaned.length);
console.log('Characters removed:', testText.length - cleaned.length);
