/**
 * Demo Transcript Adapter
 *
 * A demo adapter that generates placeholder transcripts.
 * In production, this would integrate with Whisper, Deepgram, etc.
 */

import type {
  TranscriptAdapter,
  TranscriptInput,
  TranscriptOutput,
} from '../types/adapters';
import type { SuggestedTransaction } from '../types/suggested-transaction';
import type { TimelineFrame, TrackId } from '@timelinx/core';
import type { CaptionId } from '../types/internal';

// ---------------------------------------------------------------------------
// Demo Transcript Adapter
// ---------------------------------------------------------------------------

export class DemoTranscriptAdapter implements TranscriptAdapter {
  readonly id = 'demo-transcript';
  readonly name = 'Demo Transcript Adapter';
  readonly version = '1.0.0';

  /**
   * Check if adapter is available.
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Generate a demo transcript.
   * In production, this would call an actual speech-to-text API.
   */
  async generateTranscript(input: TranscriptInput): Promise<TranscriptOutput> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Generate demo transcript based on input
    const startFrame = (input.startFrame as number) || 0;
    const endFrame = (input.endFrame as number) || 300; // 10 seconds at 30fps
    const duration = endFrame - startFrame;

    // Demo words
    const demoWords = [
      { text: 'Hello', startFrame: 0, endFrame: 30, confidence: 0.95 },
      { text: 'world', startFrame: 30, endFrame: 60, confidence: 0.92 },
      { text: 'this', startFrame: 60, endFrame: 90, confidence: 0.88 },
      { text: 'is', startFrame: 90, endFrame: 120, confidence: 0.94 },
      { text: 'a', startFrame: 120, endFrame: 150, confidence: 0.96 },
      { text: 'demo', startFrame: 150, endFrame: 180, confidence: 0.91 },
      { text: 'transcript', startFrame: 180, endFrame: 240, confidence: 0.89 },
      { text: 'from', startFrame: 240, endFrame: 270, confidence: 0.93 },
      { text: 'Timelinx', startFrame: 270, endFrame: 300, confidence: 0.97 },
    ];

    // Scale words to fit duration
    const words = demoWords
      .filter((w) => w.startFrame < duration)
      .map((w) => ({
        text: w.text,
        startFrame: (startFrame + w.startFrame) as TimelineFrame,
        endFrame: (startFrame + Math.min(w.endFrame, duration)) as TimelineFrame,
        confidence: w.confidence,
      }));

    return {
      text: words.map((w) => w.text).join(' '),
      language: input.language || 'en',
      words,
      confidence: 0.92,
    };
  }

  /**
   * Generate caption suggestions from transcript.
   */
  async generateCaptionSuggestions(
    input: TranscriptInput,
    trackId: TrackId,
  ): Promise<SuggestedTransaction[]> {
    const transcript = await this.generateTranscript(input);
    const suggestions: SuggestedTransaction[] = [];

    if (!transcript.words || transcript.words.length === 0) {
      return suggestions;
    }

    // Group words into caption segments (max 6 words per caption)
    const wordsPerCaption = 6;
    const segments: typeof transcript.words[] = [];

    for (let i = 0; i < transcript.words.length; i += wordsPerCaption) {
      segments.push(transcript.words.slice(i, i + wordsPerCaption));
    }

    // Create a caption for each segment
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const startFrame = segment[0].startFrame;
      const endFrame = segment[segment.length - 1].endFrame;
      const text = segment.map((w) => w.text).join(' ');

      const transaction = {
        id: `caption-${i}`,
        label: `Add caption ${i + 1}`,
        timestamp: Date.now(),
        operations: [
          {
            type: 'ADD_CAPTION' as const,
            caption: {
              id: `caption-${i}` as CaptionId,
              text,
              startFrame,
              endFrame,
              language: 'en',
              burnIn: true,
              style: {
                fontSize: 24,
                fontFamily: 'Arial',
                color: '#ffffff',
                backgroundColor: 'rgba(0,0,0,0.7)',
                hAlign: 'center' as const,
                vAlign: 'bottom' as const,
              },
            },
            trackId: trackId as TrackId,
          },
        ],
      };

      suggestions.push({
        id: `caption-suggestion-${i}`,
        label: `Caption: "${text.substring(0, 30)}..."`,
        category: 'caption',
        confidence: 'high',
        transaction,
        description: `Add caption from frame ${startFrame} to ${endFrame}`,
        preview: {
          type: 'caption',
          text,
          startFrame,
          endFrame,
        },
        generatedAt: Date.now(),
        source: 'demo-transcript-adapter',
      });
    }

    return suggestions;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createDemoTranscriptAdapter(): DemoTranscriptAdapter {
  return new DemoTranscriptAdapter();
}
