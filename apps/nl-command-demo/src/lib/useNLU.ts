import { useState, useCallback, useRef } from 'react';
import { DemoNLUAdapter, SuggestionManager, type SuggestedTransaction } from '@timelinx/ai';
import type { TimelineEngine } from '@timelinx/react';

export function useNLU() {
  const [suggestions, setSuggestions] = useState<SuggestedTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const adapterRef = useRef(new DemoNLUAdapter());
  const managerRef = useRef(new SuggestionManager());

  const processCommand = useCallback(async (command: string, engine: TimelineEngine) => {
    setIsProcessing(true);
    try {
      // Get current state from engine
      const state = engine.getState();
      
      // Parse command
      const intent = await adapterRef.current.parseCommand({
        command,
        context: {
          selectedClipIds: Array.from(state.selectedClipIds),
          currentFrame: state.playhead?.frame ?? 0,
          fps: state.timeline.fps,
        },
      });

      // Generate suggestions
      const newSuggestions = await adapterRef.current.generateSuggestions({
        command,
        context: {
          selectedClipIds: Array.from(state.selectedClipIds),
          currentFrame: state.playhead?.frame ?? 0,
          fps: state.timeline.fps,
        },
      });

      // Add to manager
      for (const suggestion of newSuggestions) {
        managerRef.current.addSuggestion(suggestion);
      }

      setSuggestions(managerRef.current.getPendingSuggestions().map(s => s.suggestion));
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const applySuggestion = useCallback((id: string, engine: TimelineEngine) => {
    const transaction = managerRef.current.applySuggestion(id);
    if (transaction) {
      engine.dispatch(transaction);
    }
    setSuggestions(managerRef.current.getPendingSuggestions().map(s => s.suggestion));
  }, []);

  const rejectSuggestion = useCallback((id: string) => {
    managerRef.current.rejectSuggestion(id);
    setSuggestions(managerRef.current.getPendingSuggestions().map(s => s.suggestion));
  }, []);

  return {
    suggestions,
    isProcessing,
    processCommand,
    applySuggestion,
    rejectSuggestion,
  };
}
