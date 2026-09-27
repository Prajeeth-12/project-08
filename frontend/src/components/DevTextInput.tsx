import React, { useState } from 'react';
import { Send, Keyboard } from 'lucide-react';

interface DevTextInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function DevTextInput({ onSendMessage, isLoading }: DevTextInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed && !isLoading) {
      onSendMessage(trimmed);
      setText('');
    }
  };

  return (
    <>
      {/* Input bar - above control dock */}
      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="fixed bottom-[72px] left-1/2 -translate-x-1/2 z-[25] w-full max-w-[580px] px-4"
        >
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-[14px] border border-gray-200 bg-white/95 backdrop-blur-xl shadow-lg">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your response (dev mode)..."
              autoFocus
              disabled={isLoading}
              className="flex-1 bg-transparent text-[13px] text-[#111827] placeholder-[#9CA3AF] outline-none px-1 py-1"
            />
            <button
              type="submit"
              disabled={!text.trim() || isLoading}
              className="w-8 h-8 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <Send size={14} className="text-white" />
            </button>
          </div>
        </form>
      )}

      {/* Toggle button - rendered inside control dock by parent */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle dev text input"
        aria-label="Toggle dev text input"
        className={`w-10 h-[38px] rounded-lg border flex items-center justify-center cursor-pointer transition-all duration-150 ${
          isOpen
            ? 'border-[#DC2626]/50 text-[#DC2626] bg-[#DC2626]/10'
            : 'border-gray-200 bg-transparent text-[#6B7280] hover:bg-gray-50'
        }`}
      >
        <Keyboard size={18} />
      </button>
    </>
  );
}
