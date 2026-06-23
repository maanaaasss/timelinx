import { useState, useCallback, useEffect } from 'react';

const THEMES: Record<string, Record<string, string>> = {
  'dark-pro': {},
  'light': {
    '--tl-app-bg': '#e8e8ed',
    '--tl-panel-bg': '#f5f5f7',
    '--tl-toolbar-bg': '#fafafa',
    '--tl-toolbar-border': '#d1d1d6',
    '--tl-ruler-bg': '#f0f0f2',
    '--tl-ruler-tick': '#c7c7cc',
    '--tl-ruler-tick-maj': '#8e8e93',
    '--tl-ruler-text': '#636366',
    '--tl-timecode-color': '#1c1c1e',
    '--tl-track-bg': '#f5f5f7',
    '--tl-track-bg-video': '#e8f0f8',
    '--tl-track-bg-audio': '#e8f5ef',
    '--tl-track-border': '#d1d1d6',
    '--tl-label-bg': '#f0f0f2',
    '--tl-label-text': '#48484a',
    '--tl-label-text-dim': '#8e8e93',
    '--tl-label-border': '#d1d1d6',
    '--tl-clip-video-bg': '#5b9bd5',
    '--tl-clip-video-top': '#7ab3e8',
    '--tl-clip-audio-bg': '#5cb85c',
    '--tl-clip-audio-top': '#72d472',
    '--tl-clip-selected': '#007aff',
    '--tl-clip-provisional': 'rgba(0,122,255,0.25)',
    '--tl-clip-border': 'rgba(0,0,0,0.12)',
    '--tl-clip-border-sel': '#ff9500',
    '--tl-clip-text': '#ffffff',
    '--tl-clip-text-dim': 'rgba(255,255,255,0.7)',
    '--tl-clip-video-text': '#ffffff',
    '--tl-clip-audio-text': '#ffffff',
    '--tl-clip-video-accent': '#3a7cc3',
    '--tl-clip-audio-accent': '#3a9a3a',
    '--tl-playhead-color': '#ff3b30',
    '--tl-playhead-width': '2px',
    '--tl-snap-color': '#ff9500',
    '--tl-btn-bg': 'transparent',
    '--tl-btn-bg-hover': '#d1d1d6',
    '--tl-btn-bg-active': '#007aff',
    '--tl-btn-border': '#c7c7cc',
    '--tl-btn-border-active': '#007aff',
    '--tl-btn-text': '#48484a',
    '--tl-btn-text-active': '#ffffff',
    '--tl-type-video': '#007aff',
    '--tl-type-audio': '#34c759',
    '--tl-type-subtitle': '#ff9500',
    '--tl-type-title': '#af52de',
    '--tl-solo-active': '#ffcc00',
    '--tl-mute-active': '#ff3b30',
    '--tl-track-badge-bg': '#e5e5ea',
    '--tl-track-toggle-active-bg': '#d1d1d6',
    '--tl-track-vis-inactive': '#aeaeb2',
    '--tl-track-delete-hover': '#ff3b30',
    '--tl-track-add-text': '#8e8e93',
    '--tl-track-add-hover': '#007aff',
    '--tl-track-solo-active-text': '#000000',
    '--tl-track-mute-active-text': '#ffffff',
    '--tl-separator': '#c7c7cc',
    '--tl-add-track-border': '#d1d1d6',
    '--tl-text': '#1c1c1e',
    '--tl-play-btn': '#1c1c1e',
    '--tl-waveform-center': 'rgba(0,0,0,0.08)',
    '--tl-waveform-line': 'rgba(0,0,0,0.5)',
    '--tl-clip-trim': 'rgba(0,0,0,0.12)',
    '--tl-resize-handle': '#c7c7cc',
    '--tl-scrollbar-track': '#e5e5ea',
    '--tl-scrollbar-thumb': '#c7c7cc',
    '--tl-scrollbar-thumb-hover': '#aeaeb2',
  },
  'high-contrast': {
    '--tl-app-bg': '#000000',
    '--tl-panel-bg': '#0a0a0a',
    '--tl-toolbar-bg': '#111111',
    '--tl-toolbar-border': '#555555',
    '--tl-toolbar-height': '44px',
    '--tl-ruler-bg': '#0a0a0a',
    '--tl-ruler-tick': '#666666',
    '--tl-ruler-tick-maj': '#999999',
    '--tl-ruler-text': '#cccccc',
    '--tl-ruler-height': '36px',
    '--tl-timecode-color': '#ffffff',
    '--tl-track-bg': '#111111',
    '--tl-track-bg-video': '#1a1a2e',
    '--tl-track-bg-audio': '#1a2e1a',
    '--tl-track-border': '#555555',
    '--tl-track-height': '88px',
    '--tl-label-bg': '#0a0a0a',
    '--tl-label-text': '#e0e0e0',
    '--tl-label-text-dim': '#999999',
    '--tl-label-border': '#555555',
    '--tl-clip-video-bg': '#1565c0',
    '--tl-clip-video-top': '#1e88e5',
    '--tl-clip-audio-bg': '#2e7d32',
    '--tl-clip-audio-top': '#43a047',
    '--tl-clip-selected': '#2979ff',
    '--tl-clip-provisional': 'rgba(41,121,255,0.4)',
    '--tl-clip-border': 'rgba(255,255,255,0.3)',
    '--tl-clip-border-sel': '#ffab00',
    '--tl-clip-text': '#ffffff',
    '--tl-clip-text-dim': 'rgba(255,255,255,0.8)',
    '--tl-clip-video-text': '#ffffff',
    '--tl-clip-audio-text': '#ffffff',
    '--tl-clip-radius': '3px',
    '--tl-clip-video-accent': '#42a5f5',
    '--tl-clip-audio-accent': '#66bb6a',
    '--tl-playhead-color': '#ff1744',
    '--tl-playhead-width': '2px',
    '--tl-snap-color': '#ffd600',
    '--tl-btn-bg': 'transparent',
    '--tl-btn-bg-hover': '#333333',
    '--tl-btn-bg-active': '#1565c0',
    '--tl-btn-border': '#555555',
    '--tl-btn-border-active': '#2979ff',
    '--tl-btn-text': '#e0e0e0',
    '--tl-btn-text-active': '#ffffff',
    '--tl-type-video': '#2979ff',
    '--tl-type-audio': '#00c853',
    '--tl-type-subtitle': '#ffab00',
    '--tl-type-title': '#d500f9',
    '--tl-solo-active': '#ffd600',
    '--tl-mute-active': '#ff1744',
    '--tl-track-badge-bg': '#222222',
    '--tl-track-toggle-active-bg': '#333333',
    '--tl-track-vis-inactive': '#666666',
    '--tl-track-delete-hover': '#ff1744',
    '--tl-track-add-text': '#999999',
    '--tl-track-add-hover': '#2979ff',
    '--tl-track-solo-active-text': '#000000',
    '--tl-track-mute-active-text': '#ffffff',
    '--tl-separator': '#555555',
    '--tl-add-track-border': '#555555',
    '--tl-text': '#ffffff',
    '--tl-play-btn': '#ffffff',
    '--tl-waveform-center': 'rgba(255,255,255,0.2)',
    '--tl-waveform-line': 'rgba(255,255,255,0.85)',
    '--tl-clip-trim': 'rgba(255,255,255,0.3)',
    '--tl-resize-handle': '#555555',
    '--tl-scrollbar-track': '#111111',
    '--tl-scrollbar-thumb': '#555555',
    '--tl-scrollbar-thumb-hover': '#777777',
  },
};

export function useThemeManager(initial: string = 'dark-pro') {
  const [currentTheme, setCurrentTheme] = useState(() => {
    try {
      return localStorage.getItem('timeline-demo-theme') || initial;
    } catch {
      return initial;
    }
  });

  const setTheme = useCallback((themeId: string) => {
    setCurrentTheme(themeId);
    try {
      localStorage.setItem('timeline-demo-theme', themeId);
    } catch {}
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const overrides = THEMES[currentTheme] || {};

    for (const [key, value] of Object.entries(overrides)) {
      root.style.setProperty(key, value);
    }

    return () => {
      for (const key of Object.keys(overrides)) {
        root.style.removeProperty(key);
      }
    };
  }, [currentTheme]);

  return { currentTheme, setTheme };
}
