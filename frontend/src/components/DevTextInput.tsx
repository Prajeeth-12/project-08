'use client';

import { Fragment, useState } from 'react';
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
    if (text.trim() && !isLoading) {
      onSendMessage(text);
      setText('');
    }
  };

  return (
    <Fragment>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle dev text input"
        className={`rounded-lg border border-white/10 p-2 transition-colors ${
          isOpen
            ? 'border-[#DC2626]/50 bg-[#DC2626]/10 text-[#DC2626]'
            : 'text-[#e4e4e4] hover:bg-white/5'
        }`}
        style={{ width: '40px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Keyboard size={18} />
      </button>

      {/* Input Bar */}
      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="fixed left-1/2 z-[25] w-full max-w-[640px] -translate-x-1/2 px-4"
          style={{ bottom: '88px' }}
        >
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/80 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
            {/* Text Input */}
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your response (dev mode)..."
              autoFocus
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm text-[#e4e4e4] placeholder-white/30 outline-none"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!text.trim() || isLoading}
              className={`rounded-lg transition-colors ${
                !text.trim() || isLoading
                  ? 'bg-[#DC2626] opacity-30'
                  : 'bg-[#DC2626] hover:bg-[#B91C1C]'
              }`}
              style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
        </form>
      )}
    </Fragment>
  );
}
