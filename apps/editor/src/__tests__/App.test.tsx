import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('Editor App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.tl-layout')).not.toBeNull();
  });

  it('renders the timeline editor shell', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.tl-layout')).toHaveAttribute('tabindex', '0');
  });

  it('renders the editor tracks', () => {
    render(<App />);
    expect(screen.getByText('V1 — Main')).toBeInTheDocument();
    expect(screen.getByText('A1 — Music')).toBeInTheDocument();
  });

  it('renders the production panel controls', () => {
    render(<App />);
    expect(screen.getAllByText('Inspector').length).toBeGreaterThan(0);
    expect(screen.getByText('Effects')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('renders the status bar', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.tl-status-bar')).not.toBeNull();
  });

  it('renders the timeline toolbar', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.tl-toolbar-v2')).not.toBeNull();
  });

  it('renders the timeline ruler', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.tl-ruler-canvas')).not.toBeNull();
  });
});
