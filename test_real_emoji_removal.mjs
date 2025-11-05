const testText = `### 🎯 Why the Answer is False
That question is a tricky one! The statement, "Industrial regions are usually developed in isolated rural areas," is **false** ✅.
Think about the word 'industry'—it means making things in factories. If you were building a big factory, would you put it somewhere totally isolated, far away from everyone? Probably not!
Industrial regions need a lot of things to run smoothly, like workers, raw materials, and customers. It's much easier and cheaper to get these things 💡 📉 🏭 🛣 🍕 📚 🚄 👍`;

console.log('=== ORIGINAL ===');
console.log(testText);

// Test individual emoji removal
let cleaned = testText;

console.log('\n=== TESTING EMOJI REMOVAL ===');

// Test the regex patterns
cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]/gu, '[EMO1]'); // Emoticons
console.log('After emoticons:', cleaned.includes('👍') ? 'FAILED' : 'OK');

cleaned = testText;
cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, '[EMO2]'); // Symbols & Pictographs  
console.log('After symbols:', cleaned.includes('🎯') ? 'FAILED' : 'OK');

cleaned = testText;
cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, '[EMO3]'); // Miscellaneous Symbols
console.log('After misc symbols:', cleaned.includes('✅') ? 'FAILED' : 'OK');

// Now test all together
cleaned = testText;
cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Symbols & Pictographs
cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport & Map
cleaned = cleaned.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ''); // Flags
cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, '');   // Miscellaneous Symbols
cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, '');   // Dingbats
cleaned = cleaned.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); // Supplemental Symbols
cleaned = cleaned.replace(/[\u{1FA00}-\u{1FA6F}]/gu, ''); // Extended Symbols
cleaned = cleaned.replace(/[\u{1FA70}-\u{1FAFF}]/gu, ''); // Extended Symbols 2

console.log('\n=== AFTER ALL REGEX ===');
console.log(cleaned);

// Check if any emojis remain
const emojiRegex = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu;
const remaining = cleaned.match(emojiRegex);
if (remaining) {
  console.log('\n⚠️  REMAINING EMOJIS:', remaining.join(' '));
} else {
  console.log('\n✅ All emojis removed!');
}
