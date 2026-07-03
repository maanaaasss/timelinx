/**
 * Demo NLU Adapter
 *
 * A demo adapter that parses simple natural language commands.
 * In production, this would integrate with GPT, Claude, etc.
 */

import type {
  NLUAdapter,
  NLUInput,
  ParsedIntent,
} from '../types/adapters';
import type { SuggestedTransaction, ConfidenceLevel } from '../types/suggested-transaction';
import type { TimelineFrame, ClipId, MarkerId, TrackId } from '@timelinx/core';
import type { CaptionId } from '../types/internal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function numericToConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Demo NLU Adapter
// ---------------------------------------------------------------------------

export class DemoNLUAdapter implements NLUAdapter {
  readonly id = 'demo-nlu';
  readonly name = 'Demo NLU Adapter';
  readonly version = '1.0.0';

  /**
   * Check if adapter is available.
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Parse a natural language command into an intent.
   */
  async parseCommand(input: NLUInput): Promise<ParsedIntent> {
    const command = input.command.toLowerCase().trim();

    // Simple pattern matching for demo
    if (command.includes('delete') || command.includes('remove')) {
      return this.parseDeleteCommand(command, input);
    }

    if (command.includes('trim') || command.includes('cut')) {
      return this.parseTrimCommand(command, input);
    }

    if (command.includes('move') || command.includes('shift')) {
      return this.parseMoveCommand(command, input);
    }

    if (command.includes('add caption') || command.includes('caption')) {
      return this.parseCaptionCommand(command, input);
    }

    if (command.includes('add marker') || command.includes('marker')) {
      return this.parseMarkerCommand(command, input);
    }

    if (command.includes('split') || command.includes('slice')) {
      return this.parseSplitCommand(command, input);
    }

    // Default: unknown command
    return {
      intent: 'unknown',
      params: {},
      confidence: 0.1,
      description: `I didn't understand: "${input.command}"`,
    };
  }

  /**
   * Generate suggested transactions from natural language.
   */
  async generateSuggestions(input: NLUInput): Promise<SuggestedTransaction[]> {
    const intent = await this.parseCommand(input);
    const suggestions: SuggestedTransaction[] = [];

    // Generate transactions based on intent
    switch (intent.intent) {
      case 'delete':
        suggestions.push(...this.generateDeleteSuggestions(intent, input));
        break;
      case 'trim':
        suggestions.push(...this.generateTrimSuggestions(intent, input));
        break;
      case 'move':
        suggestions.push(...this.generateMoveSuggestions(intent, input));
        break;
      case 'add_caption':
        suggestions.push(...this.generateCaptionSuggestions(intent, input));
        break;
      case 'add_marker':
        suggestions.push(...this.generateMarkerSuggestions(intent, input));
        break;
      case 'split':
        suggestions.push(...this.generateSplitSuggestions(intent, input));
        break;
    }

    return suggestions;
  }

  // ---------------------------------------------------------------------------
  // Command Parsers
  // ---------------------------------------------------------------------------

  private parseDeleteCommand(_command: string, input: NLUInput): ParsedIntent {
    const selectedClips = input.context?.selectedClipIds || [];

    if (selectedClips.length > 0) {
      return {
        intent: 'delete',
        params: { clipIds: selectedClips },
        confidence: 0.9,
        description: `Delete ${selectedClips.length} selected clip(s)`,
      };
    }

    return {
      intent: 'delete',
      params: {},
      confidence: 0.5,
      description: 'No clips selected to delete',
    };
  }

  private parseTrimCommand(_command: string, input: NLUInput): ParsedIntent {
    const frame = input.context?.currentFrame || 0;
    const selectedClips = input.context?.selectedClipIds || [];

    if (selectedClips.length > 0) {
      return {
        intent: 'trim',
        params: {
          clipIds: selectedClips,
          edge: 'end',
          frame,
        },
        confidence: 0.85,
        description: `Trim ${selectedClips.length} clip(s) to frame ${frame}`,
      };
    }

    return {
      intent: 'trim',
      params: { frame },
      confidence: 0.5,
      description: 'No clips selected to trim',
    };
  }

  private parseMoveCommand(command: string, input: NLUInput): ParsedIntent {
    const frame = input.context?.currentFrame || 0;
    const selectedClips = input.context?.selectedClipIds || [];

    // Try to extract frame number from command
    const frameMatch = command.match(/(\d+)/);
    const targetFrame = frameMatch ? parseInt(frameMatch[1]) : frame;

    if (selectedClips.length > 0) {
      return {
        intent: 'move',
        params: {
          clipIds: selectedClips,
          targetFrame,
        },
        confidence: 0.8,
        description: `Move ${selectedClips.length} clip(s) to frame ${targetFrame}`,
      };
    }

    return {
      intent: 'move',
      params: { targetFrame },
      confidence: 0.5,
      description: 'No clips selected to move',
    };
  }

  private parseCaptionCommand(command: string, input: NLUInput): ParsedIntent {
    // Extract caption text from quotes or after "caption"
    const textMatch = command.match(/["'](.+?)["']/) || command.match(/caption\s+(.+)/);
    const text = textMatch ? textMatch[1] : 'New caption';

    const frame = input.context?.currentFrame || 0;
    const fps = input.context?.fps || 30;

    return {
      intent: 'add_caption',
      params: {
        text,
        startFrame: frame,
        endFrame: (frame as number) + fps * 3,
      },
      confidence: 0.85,
      description: `Add caption: "${text}"`,
    };
  }

  private parseMarkerCommand(command: string, input: NLUInput): ParsedIntent {
    const frame = input.context?.currentFrame || 0;

    // Try to extract marker label
    const labelMatch = command.match(/marker\s+(.+)/);
    const label = labelMatch ? labelMatch[1] : 'Marker';

    return {
      intent: 'add_marker',
      params: {
        frame,
        label,
        color: '#ff6b6b',
      },
      confidence: 0.9,
      description: `Add marker at frame ${frame}`,
    };
  }

  private parseSplitCommand(_command: string, input: NLUInput): ParsedIntent {
    const frame = input.context?.currentFrame || 0;
    const selectedClips = input.context?.selectedClipIds || [];

    if (selectedClips.length > 0) {
      return {
        intent: 'split',
        params: {
          clipIds: selectedClips,
          frame,
        },
        confidence: 0.85,
        description: `Split ${selectedClips.length} clip(s) at frame ${frame}`,
      };
    }

    return {
      intent: 'split',
      params: { frame },
      confidence: 0.5,
      description: 'No clips selected to split',
    };
  }

  // ---------------------------------------------------------------------------
  // Suggestion Generators
  // ---------------------------------------------------------------------------

  private generateDeleteSuggestions(
    intent: ParsedIntent,
    input: NLUInput,
  ): SuggestedTransaction[] {
    const clipIds = (intent.params.clipIds as string[]) || [];
    if (clipIds.length === 0) return [];

    const transaction = {
      id: `delete-clips-${Date.now()}`,
      label: `Delete ${clipIds.length} clip(s)`,
      timestamp: Date.now(),
      operations: clipIds.map((clipId) => ({
        type: 'DELETE_CLIP' as const,
        clipId: clipId as ClipId,
      })),
    };

    return [
      {
        id: `delete-suggestion-${Date.now()}`,
        label: intent.description,
        category: 'command',
        confidence: numericToConfidenceLevel(intent.confidence),
        transaction,
        description: intent.description,
        preview: {
          type: 'command' as const,
          intent: intent.intent,
          params: intent.params,
          input: input.command,
        },
        generatedAt: Date.now(),
        source: 'demo-nlu-adapter',
      },
    ];
  }

  private generateTrimSuggestions(
    intent: ParsedIntent,
    input: NLUInput,
  ): SuggestedTransaction[] {
    const clipIds = (intent.params.clipIds as string[]) || [];
    const frame = intent.params.frame as number;
    if (clipIds.length === 0) return [];

    const transaction = {
      id: `trim-clips-${Date.now()}`,
      label: `Trim ${clipIds.length} clip(s)`,
      timestamp: Date.now(),
      operations: clipIds.map((clipId) => ({
        type: 'RESIZE_CLIP' as const,
        clipId: clipId as ClipId,
        edge: 'end' as const,
        newFrame: frame as TimelineFrame,
      })),
    };

    return [
      {
        id: `trim-suggestion-${Date.now()}`,
        label: intent.description,
        category: 'command',
        confidence: numericToConfidenceLevel(intent.confidence),
        transaction,
        description: intent.description,
        preview: {
          type: 'command' as const,
          intent: intent.intent,
          params: intent.params,
          input: input.command,
        },
        generatedAt: Date.now(),
        source: 'demo-nlu-adapter',
      },
    ];
  }

  private generateMoveSuggestions(
    intent: ParsedIntent,
    input: NLUInput,
  ): SuggestedTransaction[] {
    const clipIds = (intent.params.clipIds as string[]) || [];
    const targetFrame = intent.params.targetFrame as number;
    if (clipIds.length === 0) return [];

    const transaction = {
      id: `move-clips-${Date.now()}`,
      label: `Move ${clipIds.length} clip(s)`,
      timestamp: Date.now(),
      operations: clipIds.map((clipId) => ({
        type: 'MOVE_CLIP' as const,
        clipId: clipId as ClipId,
        newTimelineStart: targetFrame as TimelineFrame,
      })),
    };

    return [
      {
        id: `move-suggestion-${Date.now()}`,
        label: intent.description,
        category: 'command',
        confidence: numericToConfidenceLevel(intent.confidence),
        transaction,
        description: intent.description,
        preview: {
          type: 'command' as const,
          intent: intent.intent,
          params: intent.params,
          input: input.command,
        },
        generatedAt: Date.now(),
        source: 'demo-nlu-adapter',
      },
    ];
  }

  private generateCaptionSuggestions(
    intent: ParsedIntent,
    input: NLUInput,
  ): SuggestedTransaction[] {
    const text = intent.params.text as string;
    const startFrame = intent.params.startFrame as number;
    const endFrame = intent.params.endFrame as number;

    const transaction = {
      id: `add-caption-${Date.now()}`,
      label: `Add caption: "${text}"`,
      timestamp: Date.now(),
      operations: [
        {
          type: 'ADD_CAPTION' as const,
          caption: {
            id: `caption-${Date.now()}` as CaptionId,
            text,
            startFrame: startFrame as TimelineFrame,
            endFrame: endFrame as TimelineFrame,
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
          trackId: 'track-caption' as TrackId,
        },
      ],
    };

    return [
      {
        id: `caption-suggestion-${Date.now()}`,
        label: intent.description,
        category: 'command',
        confidence: numericToConfidenceLevel(intent.confidence),
        transaction,
        description: intent.description,
        preview: {
          type: 'command' as const,
          intent: intent.intent,
          params: intent.params,
          input: input.command,
        },
        generatedAt: Date.now(),
        source: 'demo-nlu-adapter',
      },
    ];
  }

  private generateMarkerSuggestions(
    intent: ParsedIntent,
    input: NLUInput,
  ): SuggestedTransaction[] {
    const frame = intent.params.frame as number;
    const label = intent.params.label as string;
    const color = intent.params.color as string;

    const transaction = {
      id: `add-marker-${Date.now()}`,
      label: `Add marker: "${label}"`,
      timestamp: Date.now(),
      operations: [
        {
          type: 'ADD_MARKER' as const,
          marker: {
            type: 'point' as const,
            id: `marker-${Date.now()}` as MarkerId,
            frame: frame as TimelineFrame,
            label,
            color,
            scope: 'global' as const,
            linkedClipId: null,
          },
        },
      ],
    };

    return [
      {
        id: `marker-suggestion-${Date.now()}`,
        label: intent.description,
        category: 'command',
        confidence: numericToConfidenceLevel(intent.confidence),
        transaction,
        description: intent.description,
        preview: {
          type: 'command' as const,
          intent: intent.intent,
          params: intent.params,
          input: input.command,
        },
        generatedAt: Date.now(),
        source: 'demo-nlu-adapter',
      },
    ];
  }

  private generateSplitSuggestions(
    intent: ParsedIntent,
    input: NLUInput,
  ): SuggestedTransaction[] {
    const clipIds = (intent.params.clipIds as string[]) || [];
    const frame = intent.params.frame as number;
    if (clipIds.length === 0) return [];

    const transaction = {
      id: `split-clips-${Date.now()}`,
      label: `Split ${clipIds.length} clip(s)`,
      timestamp: Date.now(),
      operations: clipIds.map((clipId) => ({
        type: 'SLICE_CLIP' as const,
        clipId: clipId as ClipId,
        atFrame: frame as TimelineFrame,
      })),
    };

    return [
      {
        id: `split-suggestion-${Date.now()}`,
        label: intent.description,
        category: 'command',
        confidence: numericToConfidenceLevel(intent.confidence),
        transaction,
        description: intent.description,
        preview: {
          type: 'command' as const,
          intent: intent.intent,
          params: intent.params,
          input: input.command,
        },
        generatedAt: Date.now(),
        source: 'demo-nlu-adapter',
      },
    ];
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createDemoNLUAdapter(): DemoNLUAdapter {
  return new DemoNLUAdapter();
}
