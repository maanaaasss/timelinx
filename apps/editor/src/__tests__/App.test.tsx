import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('Editor App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.timeline-editor')).not.toBeNull();
  });

  it('renders the timeline editor shell', () => {
    const { container } = render(<App />);
    expect(container.querySelector('[role="application"]')).not.toBeNull();
  });

  it('renders sidebar buttons', () => {
    render(<App />);
    expect(screen.getByText('Media')).toBeInTheDocument();
    expect(screen.getByText('Video')).toBeInTheDocument();
    expect(screen.getByText('Audio')).toBeInTheDocument();
  });

  it('renders the top nav project name', () => {
    render(<App />);
    expect(screen.getByText('Video Popular Vlog_Duplicate')).toBeInTheDocument();
  });

  it('renders transport controls', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.transport-controls')).not.toBeNull();
  });

  it('renders the timeline toolbar', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.tl-toolbar')).not.toBeNull();
  });

  it('renders the timeline ruler', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.timeline-ruler')).not.toBeNull();
  });
});
