import React, { useState, useCallback } from 'react';
import type { TimelineEngine } from '@webpacked-timeline/react';
import { TimelineEditor, TimelineProvider } from '@webpacked-timeline/ui';
import { getEngine, resetEngine } from './lib/engine';
import { IconBar, PanelId } from './components/IconBar';
import { PanelContainer } from './components/PanelContainer';
import { Viewer } from './components/Viewer';
import { PresetSwitcher } from './components/PresetSwitcher';
import { useThemeManager } from './lib/useThemeManager';

export default function App() {
  const [engine] = useState(() => getEngine());
  const [activePanel, setActivePanel] = useState<PanelId | null>('media');
  const { currentTheme, setTheme } = useThemeManager('dark-pro');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      background: 'var(--tl-app-bg, #0f0f12)',
      color: 'var(--tl-text, rgba(255,255,255,0.9))',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden',
      WebkitFontSmoothing: 'antialiased',
    }}>
      <Header
        currentTheme={currentTheme}
        onThemeChange={setTheme}
        engine={engine}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <IconBar
          activePanel={activePanel}
          onPanelToggle={(id) => setActivePanel(activePanel === id ? null : id)}
        />

        {activePanel && (
          <PanelContainer
            activePanel={activePanel}
            engine={engine}
            onClose={() => setActivePanel(null)}
          />
        )}

        <TimelineProvider engine={engine}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Viewer engine={engine} />
            <div style={{ flex: 1, minHeight: 0 }}>
              <TimelineEditor
                engine={engine}
                style={{ height: '100%' }}
                showToolbar={true}
              />
            </div>
          </div>
        </TimelineProvider>
      </div>
    </div>
  );
}

function Header({
  currentTheme,
  onThemeChange,
  engine,
}: {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  engine: TimelineEngine;
}) {
  const handleReset = useCallback(() => {
    resetEngine();
    window.location.reload();
  }, []);

  return (
    <header style={{
      height: 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      background: '#141418',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      flexShrink: 0,
      gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 13,
          color: '#fff',
          letterSpacing: '-0.02em',
        }}>
          T
        </div>
        <div style={{
          fontWeight: 600,
          fontSize: 14,
          letterSpacing: '-0.01em',
          color: 'rgba(255,255,255,0.9)',
        }}>
          timeline
        </div>
        <span style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.3)',
          padding: '3px 8px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 6,
          fontWeight: 500,
          letterSpacing: '0.03em',
        }}>
          demo
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <PresetSwitcher
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
        />
        <button
          onClick={handleReset}
          style={{
            height: 32,
            padding: '0 14px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'inherit',
            borderRadius: 8,
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
          }}
        >
          Reset
        </button>
      </div>
    </header>
  );
}
