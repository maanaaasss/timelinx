import React from 'react';
import { APP_VERSION } from '../version';

export function Header() {
  return (
    <header className="demo-header">
      <div className="demo-header-left">
        <span className="demo-header-logo" aria-hidden="true">W</span>
        <span className="demo-header-title">WebPacked</span>
        <span className="demo-header-context">TRAVEL DOC</span>
      </div>

      <div className="demo-header-center">
        <span className="demo-header-status"><i /> saved</span>
      </div>

      <div className="demo-header-right">
        <a className="demo-header-link" href="https://github.com/WebPacked-Timeline/timeline" target="_blank" rel="noopener noreferrer">
          docs
        </a>
        <a className="demo-header-link" href="https://github.com/WebPacked-Timeline/timeline" target="_blank" rel="noopener noreferrer">
          github
        </a>
        <div className="demo-header-sep" />
        <span className="demo-version-badge">v{APP_VERSION}</span>
      </div>
    </header>
  );
}
