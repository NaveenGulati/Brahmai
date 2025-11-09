import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Volume2, Loader2, SkipForward, SkipBack, BookOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';

interface TTSPlayerProps {
  questionId: number;
  isChild: boolean;
  explanationText?: string;
  simplificationLevel?: number;
  onHighlightChange?: (paragraphIndex: number) => void;
}

const PLAYBACK_SPEEDS = [
  { value: '0.9', label: '0.9x' },
  { value: '1', label: '1x (Normal)' },
  { value: '1.25', label: '1.25x' },
  { value: '1.5', label: '1.5x' },
];

const STORAGE_KEY = 'tts-playback-speed';

/**
 * TTSPlayer component for playing audio explanations
 * Supports playback speed control and text highlighting sync
 */
export function TTSPlayer({ questionId, isChild, explanationText, simplificationLevel, onHighlightChange }: TTSPlayerProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    // Load saved speed from localStorage
    return localStorage.getItem(STORAGE_KEY) || '1';
  });
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [showMeaningDialog, setShowMeaningDialog] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [wordMeaning, setWordMeaning] = useState('');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sentencesRef = useRef<string[]>([]);
  const sentenceTimingsRef = useRef<number[]>([]);
  const highlightIntervalRef = useRef<((this: HTMLAudioElement, ev: Event) => any) | null>(null);
  const handleEndedRef = useRef<((this: HTMLAudioElement, ev: Event) => any) | null>(null);
  const currentParagraphIndexRef = useRef<number>(0);
  const isSkippingRef = useRef<boolean>(false);

  // Audio generation mutations
  const parentAudioMutation = trpc.parent.generateAudio.useMutation();
  const childAudioMutation = trpc.child.generateAudio.useMutation();
  const generateAudioMutation = isChild ? childAudioMutation : parentAudioMutation;
  
  // Version-specific audio generation for simplified explanations
  const parentAudioVersionMutation = trpc.parent.generateAudioForVersion.useMutation();
  const childAudioVersionMutation = trpc.child.generateAudioForVersion.useMutation();
  const generateAudioVersionMutation = isChild ? childAudioVersionMutation : parentAudioVersionMutation;

  // Get tRPC utils for manual queries
  const utils = trpc.useUtils();
  
  // Set audio src imperatively to prevent React from resetting it on re-renders
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      console.log('[TTS] Setting audio src imperatively:', audioUrl);
      // Reset all state when new audio loads
      setAudioReady(false);
      setCurrentParagraphIndex(0);
      currentParagraphIndexRef.current = 0;
      setIsPlaying(false);
      console.log('[TTS] Reset state for new audio');
      // Only set src if it's different (avoid unnecessary reloads)
      if (audioRef.current.src !== audioUrl) {
        audioRef.current.src = audioUrl;
        // Don't call load() - browser loads automatically and load() resets currentTime
      }
    }
  }, [audioUrl]);

  // Split text into paragraphs for highlighting
  useEffect(() => {
    if (explanationText) {
      // Split by double newlines (paragraphs)
      const paragraphs = explanationText
        .split(/\n\n+/)
        .filter(p => p.trim().length > 0);
      
      sentencesRef.current = paragraphs;
      
      // Calculate cumulative character counts for timing
      const totalChars = paragraphs.reduce((sum, p) => sum + p.length, 0);
      let cumulativeChars = 0;
      const timings = paragraphs.map(p => {
        cumulativeChars += p.length;
        return cumulativeChars / totalChars; // Fraction of total content
      });
      
      sentenceTimingsRef.current = timings;
      
      console.log('[TTS] Paragraphs:', paragraphs.length);
      console.log('[TTS] Character-based timings:', timings.map(t => (t * 100).toFixed(1) + '%'));
    }
  }, [explanationText, playbackSpeed]);

  // Update audio playback speed when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = parseFloat(playbackSpeed);
    }
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, playbackSpeed);
  }, [playbackSpeed]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      stopHighlighting();
    };
  }, []);

  const startHighlighting = () => {
    if (!onHighlightChange || !audioRef.current || sentencesRef.current.length === 0) {
      console.log('[TTS] Cannot start highlighting:', { 
        hasCallback: !!onHighlightChange, 
        hasAudio: !!audioRef.current,
        paragraphCount: sentencesRef.current.length 
      });
      return;
    }
    
    // Stop any existing highlighting first
    stopHighlighting();
    
    const paragraphCount = sentencesRef.current.length;
    console.log('[TTS] Starting highlighting with', paragraphCount, 'paragraphs');
    console.log('[TTS] Audio duration:', audioRef.current.duration, 'seconds');
    
    // Highlight current paragraph (don't reset to 0)
    const currentIndex = currentParagraphIndexRef.current;
    console.log('[TTS] Initial highlight at paragraph', currentIndex);
    onHighlightChange(currentIndex);
    
    // Use audio's timeupdate event for accurate timing
    const handleTimeUpdate = () => {
      if (!audioRef.current) return;
      
      // Skip timeupdate processing during skip operations
      if (isSkippingRef.current) {
        return;
      }
      
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      
      // Calculate audio progress
      const progress = currentTime / duration;
      
      // Find which paragraph based on character-weighted timings
      // Start from current position to avoid recalculating from 0
      let targetIndex = currentParagraphIndexRef.current;
      
      // Check if we need to move forward
      while (targetIndex < sentenceTimingsRef.current.length - 1 && 
             progress > sentenceTimingsRef.current[targetIndex]) {
        targetIndex++;
      }
      
      // Check if we need to move backward (e.g., user manually seeked)
      while (targetIndex > 0 && 
             progress < (targetIndex === 0 ? 0 : sentenceTimingsRef.current[targetIndex - 1])) {
        targetIndex--;
      }
      
      // Ensure we don't exceed paragraph count
      targetIndex = Math.min(Math.max(0, targetIndex), paragraphCount - 1);
      
      // Use ref to track current index (not local variable)
      if (targetIndex !== currentParagraphIndexRef.current) {
        currentParagraphIndexRef.current = targetIndex;
        setCurrentParagraphIndex(targetIndex);
        console.log('[TTS] Highlighting paragraph', targetIndex, 'at', currentTime.toFixed(2), 's (', (progress * 100).toFixed(1), '% audio, target:', (sentenceTimingsRef.current[targetIndex] * 100).toFixed(1), '% content)');
        onHighlightChange(targetIndex);
      }
    };
    
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    highlightIntervalRef.current = handleTimeUpdate as any; // Store for cleanup
    
    // Clean up listener when audio ends
    const handleEnded = () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('ended', handleEnded);
      }
      highlightIntervalRef.current = null;
      console.log('[TTS] Clearing highlight');
      onHighlightChange(-1);
    };
    
    audioRef.current.addEventListener('ended', handleEnded);
    handleEndedRef.current = handleEnded; // Store for cleanup
  };

  const stopHighlighting = () => {
    console.log('[TTS stopHighlighting] Cleaning up event listeners');
    if (audioRef.current) {
      // Remove timeupdate listener if it exists
      if (highlightIntervalRef.current) {
        audioRef.current.removeEventListener('timeupdate', highlightIntervalRef.current);
        highlightIntervalRef.current = null;
      }
      // Remove ended listener if it exists
      if (handleEndedRef.current) {
        audioRef.current.removeEventListener('ended', handleEndedRef.current);
        handleEndedRef.current = null;
      }
    }
    if (onHighlightChange) {
      onHighlightChange(-1); // Clear highlight
    }
  };

  const handleGenerateAudio = async () => {
    try {
      console.log('[TTSPlayer] Generating audio for question', questionId, 'level', simplificationLevel);
      
      let result;
      // Use version-specific audio generation if simplification level is provided
      if (simplificationLevel !== undefined && simplificationLevel > 0) {
        result = await generateAudioVersionMutation.mutateAsync({ 
          questionId, 
          simplificationLevel 
        });
      } else {
        result = await generateAudioMutation.mutateAsync({ questionId });
      }
      
      console.log('[TTSPlayer] Audio generated:', result);
      if (result && result.audioUrl) {
        setAudioUrl(result.audioUrl);
        console.log('[TTSPlayer] Audio URL set:', result.audioUrl);
      } else {
        console.error('[TTSPlayer] No audioUrl in result:', result);
        alert('Failed to generate audio: No URL returned');
      }
    } catch (error) {
      console.error('[TTSPlayer] Failed to generate audio:', error);
      alert('Failed to generate audio: ' + (error as any).message);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    console.log('[TTS handlePlayPause] Called, isPlaying:', isPlaying);
    
    if (isPlaying) {
      audioRef.current.pause();
      stopHighlighting();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      startHighlighting();
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    stopHighlighting();
  };

  const handleSkipForward = () => {
    if (!audioRef.current || sentencesRef.current.length === 0) return;
    
    // Guard: Don't allow skip if audio not fully loaded
    const duration = audioRef.current.duration;
    if (isNaN(duration) || duration === 0) {
      console.log('[TTS Skip Forward] Audio not ready, duration:', duration);
      return;
    }
    
    const nextIndex = Math.min(currentParagraphIndex + 1, sentencesRef.current.length - 1);
    if (nextIndex === currentParagraphIndex) return; // Already at last paragraph
    
    // Calculate target time based on next paragraph's timing
    const targetProgress = nextIndex === 0 ? 0 : sentenceTimingsRef.current[nextIndex - 1];
    let targetTime = targetProgress * duration;
    // Add small buffer to ensure we CROSS the threshold (not just reach it)
    // This prevents the incremental logic from staying at the previous paragraph
    targetTime = Math.min(duration, targetTime + 0.1);
    
    console.log(`[TTS Skip Forward] Current: ${currentParagraphIndex}, Next: ${nextIndex}, Progress: ${(targetProgress * 100).toFixed(1)}%, Time: ${targetTime.toFixed(2)}s / ${duration.toFixed(2)}s`);
    
    const wasPlaying = !audioRef.current.paused;
    
    // CRITICAL: Remove timeupdate listener before setting currentTime
    // This prevents the listener from interfering with the skip
    const tempListener = highlightIntervalRef.current;
    if (tempListener && audioRef.current) {
      audioRef.current.removeEventListener('timeupdate', tempListener);
      console.log('[TTS Skip] Removed timeupdate listener');
    }
    
    // Update ref and state
    currentParagraphIndexRef.current = nextIndex;
    setCurrentParagraphIndex(nextIndex);
    if (onHighlightChange) {
      onHighlightChange(nextIndex);
    }
    
    // Pause before seeking (some browsers require this)
    if (wasPlaying) {
      audioRef.current.pause();
      console.log('[TTS Skip] Paused for seeking');
    }
    
    // Set currentTime
    console.log('[TTS Skip] BEFORE set - currentTime:', audioRef.current.currentTime);
    audioRef.current.currentTime = targetTime;
    console.log('[TTS Skip] AFTER set - currentTime:', audioRef.current.currentTime);
    
    // Re-add listener after a short delay
    setTimeout(() => {
      if (tempListener && audioRef.current) {
        audioRef.current.addEventListener('timeupdate', tempListener);
        console.log('[TTS Skip] Re-added listener - currentTime:', audioRef.current.currentTime);
      }
    }, 100);
    
    // Resume playing if it was playing
    if (wasPlaying) {
      console.log('[TTS Skip] Resuming playback');
      audioRef.current.play();
    }
  };

  const handleSkipBackward = () => {
    if (!audioRef.current || sentencesRef.current.length === 0) return;
    
    // Guard: Don't allow skip if audio not fully loaded
    const duration = audioRef.current.duration;
    if (isNaN(duration) || duration === 0) {
      console.log('[TTS Skip Backward] Audio not ready, duration:', duration);
      return;
    }
    
    const prevIndex = Math.max(currentParagraphIndex - 1, 0);
    if (prevIndex === currentParagraphIndex) return; // Already at first paragraph
    
    // Calculate target time based on previous paragraph's timing
    const targetProgress = prevIndex === 0 ? 0 : sentenceTimingsRef.current[prevIndex - 1];
    let targetTime = targetProgress * duration;
    // Add small buffer to ensure we CROSS the threshold (not just reach it)
    // This prevents the incremental logic from staying at the wrong paragraph
    targetTime = Math.min(duration, targetTime + 0.1);
    
    console.log(`[TTS Skip Backward] Current: ${currentParagraphIndex}, Prev: ${prevIndex}, Progress: ${(targetProgress * 100).toFixed(1)}%, Time: ${targetTime.toFixed(2)}s / ${duration.toFixed(2)}s`);
    
    const wasPlaying = !audioRef.current.paused;
    
    // CRITICAL: Remove timeupdate listener before setting currentTime
    // This prevents the listener from interfering with the skip
    const tempListener = highlightIntervalRef.current;
    if (tempListener && audioRef.current) {
      audioRef.current.removeEventListener('timeupdate', tempListener);
      console.log('[TTS Skip] Removed timeupdate listener');
    }
    
    // Update ref and state
    currentParagraphIndexRef.current = prevIndex;
    setCurrentParagraphIndex(prevIndex);
    if (onHighlightChange) {
      onHighlightChange(prevIndex);
    }
    
    // Pause before seeking (some browsers require this)
    if (wasPlaying) {
      audioRef.current.pause();
      console.log('[TTS Skip] Paused for seeking');
    }
    
    // Set currentTime
    console.log('[TTS Skip] BEFORE set - currentTime:', audioRef.current.currentTime);
    audioRef.current.currentTime = targetTime;
    console.log('[TTS Skip] AFTER set - currentTime:', audioRef.current.currentTime);
    
    // Re-add listener after a short delay
    setTimeout(() => {
      if (tempListener && audioRef.current) {
        audioRef.current.addEventListener('timeupdate', tempListener);
        console.log('[TTS Skip] Re-added listener - currentTime:', audioRef.current.currentTime);
      }
    }, 100);
    
    // Resume playing if it was playing
    if (wasPlaying) {
      console.log('[TTS Skip] Resuming playback');
      audioRef.current.play();
    }
  };

  const handleGetMeaning = async () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (!text) {
      alert('Please select a word or phrase first');
      return;
    }
    
    setSelectedText(text);
    setShowMeaningDialog(true);
    setWordMeaning('Loading...');
    
    try {
      // Use utils.client to make the query
      const result = isChild 
        ? await utils.client.child.getWordMeaning.query({ word: text })
        : await utils.client.parent.getWordMeaning.query({ word: text });
      
      setWordMeaning(result.meaning || 'Could not find meaning');
    } catch (error) {
      console.error('Failed to get meaning:', error);
      setWordMeaning('Failed to get meaning. Please try again.');
    }
  };

  return (
    <>
      {/* Sticky audio controls - always visible */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm flex items-center gap-2 p-3 rounded-lg">
        {audioUrl && (
          <audio
            ref={audioRef}
            onEnded={handleAudioEnded}
            onLoadedMetadata={() => {
              if (audioRef.current) {
                audioRef.current.playbackRate = parseFloat(playbackSpeed);
              }
            }}
            onCanPlayThrough={() => {
              if (audioRef.current) {
                // Mark audio as ready when it's fully buffered and seekable
                if (!isNaN(audioRef.current.duration)) {
                  console.log('[TTS] Audio fully loaded, waiting 3s for complete buffering...');
                  // Wait 3 seconds to ensure audio is fully buffered before allowing skip
                  setTimeout(() => {
                    console.log('[TTS] Audio ready for playback and seeking');
                    setAudioReady(true);
                  }, 3000);
                }
              }
            }}
          />
        )}
        
        <Button
          onClick={handleSkipBackward}
          variant="outline"
          size="sm"
          className="border-blue-300 text-blue-700 hover:bg-blue-50"
          title="Previous paragraph"
          disabled={!audioUrl || !audioReady || generateAudioMutation.isPending}
        >
          <SkipBack className="w-3 h-3" />
        </Button>
        
        {/* Show Generate button if no audio, otherwise show Play/Pause */}
        {!audioUrl ? (
          <Button
            onClick={handleGenerateAudio}
            disabled={generateAudioMutation.isPending}
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            {generateAudioMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Volume2 className="w-3 h-3 mr-2" />
                Generate Audio Explanation
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handlePlayPause}
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <Volume2 className="w-3 h-3 mr-2" />
            {isPlaying ? 'Pause' : 'Play'} Audio
          </Button>
        )}
        
        <Button
          onClick={handleSkipForward}
          variant="outline"
          size="sm"
          className="border-blue-300 text-blue-700 hover:bg-blue-50"
          title="Next paragraph"
          disabled={!audioUrl || !audioReady || generateAudioMutation.isPending}
        >
          <SkipForward className="w-3 h-3" />
        </Button>
        
        <Select value={playbackSpeed} onValueChange={setPlaybackSpeed}>
          <SelectTrigger className="w-[120px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAYBACK_SPEEDS.map(speed => (
              <SelectItem key={speed.value} value={speed.value}>
                {speed.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={handleGetMeaning}
            variant="outline"
            size="sm"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
            title="Get meaning of selected word"
          >
            <BookOpen className="w-3 h-3 mr-1" />
            Word Meaning
          </Button>
        </div>
      </div>

      {/* Word Meaning Dialog */}
      {showMeaningDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowMeaningDialog(false)}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
                Word Meaning
              </h3>
              <button onClick={() => setShowMeaningDialog(false)} className="text-gray-400 hover:text-gray-600 text-xl">
                ✕
              </button>
            </div>
            <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Selected text:</p>
              <p className="font-semibold text-purple-700 text-xl">{selectedText}</p>
            </div>
            <div className="prose prose-sm max-w-none">
              <div className="text-gray-900 leading-relaxed" dangerouslySetInnerHTML={{ 
                __html: wordMeaning
                  .replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-900">$1</strong>')
                  .replace(/\*(.+?)\*/g, '<em>$1</em>')
                  .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
                  .replace(/\n\n/g, '</p><p class="mt-2">')
                  .replace(/^(.+)$/gm, (match) => match.startsWith('<') ? match : `<p>${match}</p>`)
              }} />
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setShowMeaningDialog(false)} variant="outline" size="sm">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

