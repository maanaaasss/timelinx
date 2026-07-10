import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('Editor App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('TimelineX Editor')).toBeDefined();
  });

  it('displays the header', () => {
    render(<App />);
    expect(screen.getByText('TimelineX Editor')).toBeInTheDocument();
    expect(screen.getByText('Milestone 2 — Effects, Transitions, Keyframes, Text Clips')).toBeInTheDocument();
  });

  it('displays toolbar with tool buttons', () => {
    render(<App />);
    expect(screen.getByText('V')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('displays undo/redo buttons', () => {
    render(<App />);
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Redo')).toBeInTheDocument();
  });

  it('displays track labels', () => {
    render(<App />);
    expect(screen.getByText('V1 — Main')).toBeInTheDocument();
    expect(screen.getByText('V2 — Overlay')).toBeInTheDocument();
    expect(screen.getByText('A1 — Music')).toBeInTheDocument();
  });

  it('displays right panel with tabs', () => {
    render(<App />);
    expect(screen.getAllByText('Inspector').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Effects')).toBeInTheDocument();
    expect(screen.getByText('Transitions')).toBeInTheDocument();
    expect(screen.getByText('Keyframes')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('displays status bar', () => {
    render(<App />);
    expect(screen.getByText('Position:')).toBeInTheDocument();
    expect(screen.getByText('Tool:')).toBeInTheDocument();
  });
});
