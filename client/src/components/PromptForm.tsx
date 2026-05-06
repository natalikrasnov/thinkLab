import '../styles/PromptForm.scss';
import { useState } from 'react';
import { ZoomInIcon } from '../assets/icons';

interface PromptFormProps {
  onSubmit: (input: string) => void;
  isSimulating: boolean;
  isCentered?: boolean;
}

export function PromptForm({ onSubmit, isSimulating, isCentered }: PromptFormProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    onSubmit(input);
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className={`input-form ${isCentered ? 'centered' : ''}`}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a thought..."
        className="text-input"
        disabled={isSimulating}
        autoFocus
      />
      
      {isSimulating && (
        <div className="loading-indicator">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      )}

      <button type="submit" className="submit-button" disabled={isSimulating} aria-label="Generate">
        <ZoomInIcon size={20} />
      </button>
    </form>
  );
}
