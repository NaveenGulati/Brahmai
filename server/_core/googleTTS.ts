import { ENV } from './env';
import { storagePut } from '../storage';

/**
 * Clean markdown formatting from text before sending to TTS
 * Removes all markdown syntax while preserving the actual content
 */
function markdownToPlainText(markdown: string): string {
  let text = markdown;
  
  // Remove code blocks (``` or `)
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');
  
  // Add pauses after headings (convert # to text with pause)
  // Using SSML break tags for natural pauses
  text = text.replace(/^#{1,6}\s+(.+)$/gm, '$1. ');
  
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
  
  // Add pauses between sections (double line breaks become longer pauses)
  // Replace double newlines with period + space for natural pause
  text = text.replace(/\n\n+/g, '. ');
  
  // Remove ALL emojis (comprehensive Unicode ranges)
  // This removes all emoji characters including:
  // - Emoticons (😀😃😄)
  // - Symbols (🎯💡🔬)
  // - Flags (🇮🇳🇺🇸)
  // - Objects (📚✨🎨)
  // - And all other emoji Unicode blocks
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

/**
 * Generate speech audio from text using Google Cloud Text-to-Speech API
 * @param text - The text to convert to speech
 * @returns URL of the generated audio file in S3
 */
export async function generateSpeech(text: string): Promise<string> {
  const apiKey = ENV.googleTTSApiKey;
  
  if (!apiKey) {
    throw new Error('Google TTS API key not configured');
  }

  // Clean markdown formatting before sending to TTS
  const cleanedText = markdownToPlainText(text);
  
  console.log('[Google TTS] Original text length:', text.length);
  console.log('[Google TTS] Original text preview:', text.substring(0, 200));
  console.log('[Google TTS] Cleaned text length:', cleanedText.length);
  console.log('[Google TTS] Cleaned text preview:', cleanedText.substring(0, 200));
  console.log('[Google TTS] Emojis removed:', text.length - cleanedText.length, 'characters');

  // Parse the service account JSON
  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(apiKey);
  } catch (error) {
    throw new Error('Invalid Google TTS API key format. Expected service account JSON.');
  }

  // Fix private key format (add spaces to PEM headers/footers)
  let privateKey = serviceAccount.private_key;
  if (privateKey) {
    privateKey = privateKey
      .replace(/-----BEGINPRIVATEKEY-----/g, '-----BEGIN PRIVATE KEY-----')
      .replace(/-----ENDPRIVATEKEY-----/g, '-----END PRIVATE KEY-----')
      .replace(/\\n/g, '\n'); // Convert escaped newlines to actual newlines
  }

  // Generate JWT token for authentication
  const crypto = await import('crypto');
  
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  sign.end();
  
  const signature = sign.sign(privateKey, 'base64url');
  const jwt = `${signatureInput}.${signature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  // Call Google TTS API
  const ttsResponse = await fetch(
    'https://texttospeech.googleapis.com/v1/text:synthesize',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: cleanedText },
        voice: {
          languageCode: 'en-IN',
          name: 'en-IN-Neural2-D', // Indian English female voice (natural, human-like)
          ssmlGender: 'FEMALE',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0.0,
        },
      }),
    }
  );

  if (!ttsResponse.ok) {
    const error = await ttsResponse.text();
    throw new Error(`Google TTS API error: ${error}`);
  }

  const ttsData = await ttsResponse.json();
  const audioContent = ttsData.audioContent;

  // Upload to S3
  const audioBuffer = Buffer.from(audioContent, 'base64');
  const filename = `tts-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
  const { url } = await storagePut(`audio/${filename}`, audioBuffer, 'audio/mpeg');

  console.log('[Google TTS] Audio generated and uploaded:', url);
  return url;
}

