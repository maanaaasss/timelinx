/**
 * Tests for @timelinx/ai
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SuggestionManager,
  createSuggestionManager,
  DemoTranscriptAdapter,
  createDemoTranscriptAdapter,
  DemoNLUAdapter,
  createDemoNLUAdapter,
  generateSceneMarkerSuggestions,
  detectSilence,
} from '../index';
import type { SuggestedTransaction, DetectedScene, DetectedSilence } from '../index';

// ---------------------------------------------------------------------------
// SuggestionManager Tests
// ---------------------------------------------------------------------------

describe('SuggestionManager', () => {
  let manager: SuggestionManager;

  beforeEach(() => {
    manager = createSuggestionManager();
  });

  it('should create manager', () => {
    expect(manager).toBeDefined();
  });

  it('should add suggestions', () => {
    const suggestion: SuggestedTransaction = {
      id: 'test-1',
      label: 'Test suggestion',
      category: 'command',
      confidence: 'high',
      transaction: {
        id: 'tx-1',
        label: 'Test transaction',
        timestamp: Date.now(),
        operations: [],
      },
      generatedAt: Date.now(),
      source: 'test',
    };

    manager.addSuggestion(suggestion);
    expect(manager.getPendingSuggestions()).toHaveLength(1);
  });

  it('should approve suggestions', () => {
    const suggestion: SuggestedTransaction = {
      id: 'test-1',
      label: 'Test suggestion',
      category: 'command',
      confidence: 'high',
      transaction: {
        id: 'tx-1',
        label: 'Test transaction',
        timestamp: Date.now(),
        operations: [],
      },
      generatedAt: Date.now(),
      source: 'test',
    };

    manager.addSuggestion(suggestion);
    manager.approveSuggestion('test-1');

    expect(manager.getPendingSuggestions()).toHaveLength(0);
    expect(manager.getCountByState().approved).toBe(1);
  });

  it('should reject suggestions', () => {
    const suggestion: SuggestedTransaction = {
      id: 'test-1',
      label: 'Test suggestion',
      category: 'command',
      confidence: 'high',
      transaction: {
        id: 'tx-1',
        label: 'Test transaction',
        timestamp: Date.now(),
        operations: [],
      },
      generatedAt: Date.now(),
      source: 'test',
    };

    manager.addSuggestion(suggestion);
    manager.rejectSuggestion('test-1', 'Not needed');

    expect(manager.getPendingSuggestions()).toHaveLength(0);
    expect(manager.getCountByState().rejected).toBe(1);
  });

  it('should apply approved suggestions', () => {
    const transaction = {
      id: 'tx-1',
      label: 'Test transaction',
      timestamp: Date.now(),
      operations: [],
    };

    const suggestion: SuggestedTransaction = {
      id: 'test-1',
      label: 'Test suggestion',
      category: 'command',
      confidence: 'high',
      transaction,
      generatedAt: Date.now(),
      source: 'test',
    };

    manager.addSuggestion(suggestion);
    manager.approveSuggestion('test-1');
    const result = manager.applySuggestion('test-1');

    expect(result).toBe(transaction);
    expect(manager.getCountByState().applied).toBe(1);
  });

  it('should clear all suggestions', () => {
    const suggestion: SuggestedTransaction = {
      id: 'test-1',
      label: 'Test suggestion',
      category: 'command',
      confidence: 'high',
      transaction: {
        id: 'tx-1',
        label: 'Test transaction',
        timestamp: Date.now(),
        operations: [],
      },
      generatedAt: Date.now(),
      source: 'test',
    };

    manager.addSuggestion(suggestion);
    manager.clear();

    expect(manager.getAllSuggestions()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// DemoTranscriptAdapter Tests
// ---------------------------------------------------------------------------

describe('DemoTranscriptAdapter', () => {
  let adapter: DemoTranscriptAdapter;

  beforeEach(() => {
    adapter = createDemoTranscriptAdapter();
  });

  it('should create adapter', () => {
    expect(adapter).toBeDefined();
    expect(adapter.id).toBe('demo-transcript');
  });

  it('should be available', () => {
    expect(adapter.isAvailable()).toBe(true);
  });

  it('should generate transcript', async () => {
    const result = await adapter.generateTranscript({
      assetId: 'asset-1',
    });

    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    expect(result.language).toBe('en');
    expect(result.words).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// DemoNLUAdapter Tests
// ---------------------------------------------------------------------------

describe('DemoNLUAdapter', () => {
  let adapter: DemoNLUAdapter;

  beforeEach(() => {
    adapter = createDemoNLUAdapter();
  });

  it('should create adapter', () => {
    expect(adapter).toBeDefined();
    expect(adapter.id).toBe('demo-nlu');
  });

  it('should parse delete command', async () => {
    const result = await adapter.parseCommand({
      command: 'delete selected clips',
      context: {
        selectedClipIds: ['clip-1', 'clip-2'],
      },
    });

    expect(result.intent).toBe('delete');
    expect(result.params.clipIds).toEqual(['clip-1', 'clip-2']);
  });

  it('should parse trim command', async () => {
    const result = await adapter.parseCommand({
      command: 'trim to frame 100',
      context: {
        selectedClipIds: ['clip-1'],
        currentFrame: 100,
      },
    });

    expect(result.intent).toBe('trim');
    expect(result.params.frame).toBe(100);
  });

  it('should parse move command', async () => {
    const result = await adapter.parseCommand({
      command: 'move to frame 200',
      context: {
        selectedClipIds: ['clip-1'],
      },
    });

    expect(result.intent).toBe('move');
    expect(result.params.targetFrame).toBe(200);
  });

  it('should parse caption command', async () => {
    const result = await adapter.parseCommand({
      command: 'add caption "Hello World"',
      context: {
        currentFrame: 0,
      },
    });

    expect(result.intent).toBe('add_caption');
    expect(result.params.text).toBe('hello world');
  });

  it('should parse marker command', async () => {
    const result = await adapter.parseCommand({
      command: 'add marker intro',
      context: {
        currentFrame: 0,
      },
    });

    expect(result.intent).toBe('add_marker');
    expect(result.params.label).toBe('intro');
  });

  it('should generate suggestions', async () => {
    const suggestions = await adapter.generateSuggestions({
      command: 'delete selected clips',
      context: {
        selectedClipIds: ['clip-1'],
      },
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].category).toBe('command');
  });
});

// ---------------------------------------------------------------------------
// Scene Detection Tests
// ---------------------------------------------------------------------------

describe('Scene Detection', () => {
  it('should generate scene marker suggestions', () => {
    const scenes: DetectedScene[] = [
      { frame: 100, confidence: 0.9, description: 'Scene 1' },
      { frame: 200, confidence: 0.8, description: 'Scene 2' },
    ];

    const suggestions = generateSceneMarkerSuggestions(scenes);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].category).toBe('scene');
  });
});

// ---------------------------------------------------------------------------
// Silence Detection Tests
// ---------------------------------------------------------------------------

describe('Silence Detection', () => {
  it('should detect silence in audio data', () => {
    // Create fake audio data with silence in the middle
    const sampleRate = 44100;
    const fps = 30;
    const duration = 3; // 3 seconds
    const samplesPerFrame = sampleRate / fps;
    const totalSamples = sampleRate * duration;

    const audioData = new Float32Array(totalSamples);

    // First second: speech (random noise)
    for (let i = 0; i < sampleRate; i++) {
      audioData[i] = Math.random() * 0.5;
    }

    // Second second: silence
    for (let i = sampleRate; i < sampleRate * 2; i++) {
      audioData[i] = 0.001; // Very quiet
    }

    // Third second: speech
    for (let i = sampleRate * 2; i < sampleRate * 3; i++) {
      audioData[i] = Math.random() * 0.5;
    }

    const silenceRegions = detectSilence(audioData, sampleRate, fps, {
      threshold: 0.01,
      minDuration: 10,
    });

    expect(silenceRegions.length).toBeGreaterThan(0);
    expect(silenceRegions[0].startFrame).toBeDefined();
    expect(silenceRegions[0].endFrame).toBeDefined();
  });
});
