import React, { useState, useCallback } from 'react';
import { Send } from 'lucide-react';

type CommandInputProps = {
  onCommand: (command: string) => void;
  isProcessing: boolean;
};

const EXAMPLE_COMMANDS = [
  'Delete selected clips',
  'Trim to frame 100',
  'Move to frame 200',
  'Add caption "Hello World"',
  'Add marker intro',
  'Split at current frame',
];

export function CommandInput({ onCommand, isProcessing }: CommandInputProps) {
  const [command, setCommand] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim() && !isProcessing) {
      onCommand(command.trim());
      setCommand('');
    }
  }, [command, isProcessing, onCommand]);

  const handleExampleClick = useCallback((example: string) => {
    setCommand(example);
  }, []);

  return (
    <div className="command-input-container">
      <h3>Natural Language Command</h3>
      
      <form onSubmit={handleSubmit} className="command-form">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Enter a command..."
          disabled={isProcessing}
          className="command-input"
        />
        <button
          type="submit"
          disabled={!command.trim() || isProcessing}
          className="command-submit"
        >
          <Send size={16} />
        </button>
      </form>

      <div className="example-commands">
        <span className="example-label">Try:</span>
        {EXAMPLE_COMMANDS.map((example, i) => (
          <button
            key={i}
            onClick={() => handleExampleClick(example)}
            className="example-button"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
