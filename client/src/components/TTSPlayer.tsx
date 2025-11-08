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
export function TTSPlayer({ questionId, isChild, explanationText, onHighlightChange }: TTSPlayerProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    // Load saved speed from localStorage
    return localStorage.getItem(STORAGE_KEY) || '1';
  });
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);
  const [showMeaningDialog, setShowMeaningDialog] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [wordMeaning, setWordMeaning] = useState('');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sentencesRef = useRef<string[]>([]);
  const sentenceTimingsRef = useRef<number[]>([]);
  const highlightIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Audio generation mutations
  const parentAudioMutation = trpc.parent.generateAudio.useMutation();
  const childAudioMutation = trpc.child.generateAudio.useMutation();
  const generateAudioMutation = isChild ? childAudioMutation : parentAudioMutation;

  // Get tRPC utils for manual queries
  const utils = trpc.useUtils();

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
        audioRef.current = null;
      }
      if (highlightIntervalRef.current) {
        clearInterval(highlightIntervalRef.current);
      }
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
    
    const paragraphCount = sentencesRef.current.length;
    console.log('[TTS] Starting highlighting with', paragraphCount, 'paragraphs');
    console.log('[TTS] Audio duration:', audioRef.current.duration, 'seconds');
    
    let currentParagraphIndex = 0;
    
    // Initial highlight
    console.log('[TTS] Highlighting paragraph 0');
    onHighlightChange(0);
    
    // Use audio's timeupdate event for accurate timing
    const handleTimeUpdate = () => {
      if (!audioRef.current) return;
      
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      
      // Calculate audio progress
      const progress = currentTime / duration;
      
      // Find which paragraph based on character-weighted timings
      let targetIndex = 0;
      for (let i = 0; i < sentenceTimingsRef.current.length; i++) {
        if (progress <= sentenceTimingsRef.current[i]) {
          targetIndex = i;
          break;
        }
      }
      
      // Ensure we don't exceed paragraph count
      targetIndex = Math.min(targetIndex, paragraphCount - 1);
      
      if (targetIndex !== currentParagraphIndex) {
        setCurrentParagraphIndex(targetIndex);
        console.log('[TTS] Highlighting paragraph', targetIndex, 'at', currentTime.toFixed(2), 's (', (progress * 100).toFixed(1), '% audio, target:', (sentenceTimingsRef.current[targetIndex] * 100).toFixed(1), '% content)');
        onHighlightChange(targetIndex);
      }
    };
    
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    
    // Clean up listener when audio ends
    const handleEnded = () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('ended', handleEnded);
      }
      console.log('[TTS] Clearing highlight');
      onHighlightChange(-1);
    };
    
    audioRef.current.addEventListener('ended', handleEnded);
  };

  const stopHighlighting = () => {
    if (highlightIntervalRef.current) {
      clearInterval(highlightIntervalRef.current);
      highlightIntervalRef.current = null;
    }
    if (onHighlightChange) {
      onHighlightChange(-1); // Clear highlight
    }
  };

  const handleGenerateAudio = async () => {
    try {
      console.log('[TTSPlayer] Generating audio for question', questionId);
      const result = await generateAudioMutation.mutateAsync({ questionId });
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
    
    const nextIndex = Math.min(currentParagraphIndex + 1, sentencesRef.current.length - 1);
    if (nextIndex === currentParagraphIndex) return; // Already at last paragraph
    
    // Calculate target time based on next paragraph's timing
    const duration = audioRef.current.duration;
    const targetProgress = nextIndex === 0 ? 0 : sentenceTimingsRef.current[nextIndex - 1];
    const targetTime = targetProgress * duration;
    
    console.log(`[TTS Skip Forward] Current: ${currentParagraphIndex}, Next: ${nextIndex}, Progress: ${(targetProgress * 100).toFixed(1)}%, Time: ${targetTime.toFixed(2)}s / ${duration.toFixed(2)}s`);
    
    const wasPlaying = !audioRef.current.paused;
    audioRef.current.currentTime = targetTime;
    setCurrentParagraphIndex(nextIndex);
    if (onHighlightChange) {
      onHighlightChange(nextIndex);
    }
    
    // Resume playing if it was playing
    if (wasPlaying && audioRef.current.paused) {
      audioRef.current.play();
    }
  };

  const handleSkipBackward = () => {
    if (!audioRef.current || sentencesRef.current.length === 0) return;
    
    const prevIndex = Math.max(currentParagraphIndex - 1, 0);
    if (prevIndex === currentParagraphIndex) return; // Already at first paragraph
    
    // Calculate target time based on previous paragraph's timing
    const duration = audioRef.current.duration;
    const targetProgress = prevIndex === 0 ? 0 : sentenceTimingsRef.current[prevIndex - 1];
    const targetTime = targetProgress * duration;
    
    console.log(`[TTS Skip Backward] Current: ${currentParagraphIndex}, Prev: ${prevIndex}, Progress: ${(targetProgress * 100).toFixed(1)}%, Time: ${targetTime.toFixed(2)}s / ${duration.toFixed(2)}s`);
    
    const wasPlaying = !audioRef.current.paused;
    audioRef.current.currentTime = targetTime;
    setCurrentParagraphIndex(prevIndex);
    if (onHighlightChange) {
      onHighlightChange(prevIndex);
    }
    
    // Resume playing if it was playing
    if (wasPlaying && audioRef.current.paused) {
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
      <div className={`${audioUrl ? 'sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm' : ''} flex items-center gap-2 p-3 rounded-lg`}>
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
                Generating Audio...
              </>
            ) : (
              <>
                <Volume2 className="w-3 h-3 mr-2" />
                Play Audio Explanation
              </>
            )}
          </Button>
        ) : (
          <>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={handleAudioEnded}
              onLoadedMetadata={() => {
                if (audioRef.current) {
                  audioRef.current.playbackRate = parseFloat(playbackSpeed);
                }
              }}
            />
            <Button
              onClick={handleSkipBackward}
              variant="outline"
              size="sm"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
              title="Previous paragraph"
            >
              <SkipBack className="w-3 h-3" />
            </Button>
            <Button
              onClick={handlePlayPause}
              variant="outline"
              size="sm"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {isPlaying ? 'Pause' : 'Play'} Audio
            </Button>
            <Button
              onClick={handleSkipForward}
              variant="outline"
              size="sm"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
              title="Next paragraph"
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
          </>
        )}
      </div>

      {/* Word Meaning Dialog */}
      {showMeaningDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowMeaningDialog(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Word Meaning</h3>
              <button onClick={() => setShowMeaningDialog(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Selected text:</p>
              <p className="font-semibold text-purple-700 text-lg">{selectedText}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Meaning:</p>
              <p className="text-gray-900">{wordMeaning}</p>
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

