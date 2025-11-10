import React, { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from './ui/button';

interface TextHighlighterProps {
  children: React.ReactNode;
  onSave: (highlightedText: string) => void;
  className?: string;
}

interface PopupPosition {
  top: number;
  left: number;
}

export function TextHighlighter({ children, onSave, className }: TextHighlighterProps) {
  const [selectedText, setSelectedText] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState<PopupPosition>({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length >= 10 && containerRef.current?.contains(selection?.anchorNode || null)) {
        setSelectedText(text);
        
        // Get selection position
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        
        if (rect) {
          setPopupPosition({
            top: rect.top + window.scrollY - 50, // Position above selection
            left: rect.left + window.scrollX + (rect.width / 2), // Center horizontally
          });
          setShowPopup(true);
        }
      } else {
        setShowPopup(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (showPopup && !(e.target as Element).closest('.highlight-popup')) {
        setShowPopup(false);
      }
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopup]);

  const handleSaveNote = () => {
    if (selectedText) {
      onSave(selectedText);
      setShowPopup(false);
      setSelectedText('');
      
      // Clear selection
      window.getSelection()?.removeAllRanges();
    }
  };

  return (
    <>
      <div ref={containerRef} className={className}>
        {children}
      </div>

      {showPopup && (
        <div
          className="highlight-popup fixed z-50 animate-in fade-in zoom-in duration-200"
          style={{
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <Button
            onClick={handleSaveNote}
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Add to Notes
          </Button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-3 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
            Save this to your personal notebook!
          </div>
        </div>
      )}
    </>
  );
}
