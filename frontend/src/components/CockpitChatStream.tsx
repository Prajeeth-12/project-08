import React, { useEffect, useRef } from 'react';
import { Message } from '@/hooks/useInterviewSession';
import { Loader2 } from 'lucide-react';

interface CockpitChatStreamProps {
  messages: Message[];
  turnState: 'user' | 'ai' | 'idle';
  isListening: boolean;
  isProcessing: boolean;
  accumulatedTranscript?: string;
  streamingAiText?: string;
  isUserSpeaking?: boolean;
}

const SparkleIcon: React.FC = () => (
  <div className="inline-grid grid-cols-3 gap-[2px]">
    {Array.from({ length: 9 }).map((_, i) => (
      <span key={i} className="w-[3px] h-[3px] rounded-full bg-[#DC2626] opacity-60" />
    ))}
  </div>
);

const CockpitChatStream: React.FC<CockpitChatStreamProps> = ({
  messages,
  turnState,
  isListening,
  isProcessing,
  accumulatedTranscript,
  streamingAiText,
  isUserSpeaking,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingAiText, accumulatedTranscript, turnState]);

  const visibleMessages = messages.filter(
    (m) => typeof m.content === 'string' && m.agent !== 'coach'
  );

  const lastAiIndex = (() => {
    for (let i = visibleMessages.length - 1; i >= 0; i--) {
      if (visibleMessages[i].role === 'assistant') return i;
    }
    return -1;
  })();

  return (
    <div
      className="flex flex-col gap-4 w-full max-w-lg mx-auto overflow-y-auto px-4 py-4 scroll-smooth"
      style={{
        maxHeight: 'calc(100vh - 260px)',
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 100%)',
      }}
    >
      {visibleMessages.map((msg, idx) => {
        const isAI = msg.role === 'assistant';
        const isOld = isAI && idx !== lastAiIndex;
        const text = msg.content as string;

        if (isAI) {
          return (
            <div key={idx} className="flex items-start gap-3 max-w-[90%]" style={{ opacity: isOld ? 0.35 : 1, transition: 'opacity 0.4s' }}>
              <div className="w-7 h-7 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/20 flex items-center justify-center shrink-0 mt-0.5">
                <SparkleIcon />
              </div>
              <p className="text-[14px] leading-[1.7] text-[#111827] whitespace-pre-wrap break-words">{text}</p>
            </div>
          );
        }

        return (
          <div key={idx} className="flex justify-end">
            <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-md bg-[#FEF3C7] border border-[#EAB308]/40 text-[14px] text-[#111827] leading-relaxed whitespace-pre-wrap break-words">
              {text}
            </div>
          </div>
        );
      })}

      {/* Streaming AI voice response — appears word by word as Gemini speaks */}
      {streamingAiText && (
        <div className="flex items-start gap-3 max-w-[90%]">
          <div className="w-7 h-7 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/20 flex items-center justify-center shrink-0 mt-0.5">
            <SparkleIcon />
          </div>
          <p className="text-[14px] leading-[1.7] text-[#111827] whitespace-pre-wrap break-words">
            {streamingAiText}
            <span className="inline-block w-1.5 h-3.5 bg-[#DC2626] ml-0.5 animate-pulse rounded-sm" />
          </p>
        </div>
      )}

      {/* User speaking indicator (VAD-detected) */}
      {isUserSpeaking && (
        <div className="flex justify-end">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl rounded-br-md bg-[#DC2626]/8 border border-[#DC2626]/20">
            <div className="flex gap-[3px] items-end h-4">
              {[1, 1.5, 2, 1.5, 1].map((h, i) => (
                <span key={i} className="w-1 bg-[#DC2626] rounded-full animate-bounce" style={{ height: `${h * 6}px`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
            <span className="text-xs font-medium text-[#DC2626]">Speaking...</span>
          </div>
        </div>
      )}

      {/* AI Speaking indicator */}
      {turnState === 'ai' && !streamingAiText && (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 0.15, 0.3].map((d, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-bounce" style={{ animationDelay: `${d}s` }} />
            ))}
          </div>
          <span className="text-xs font-medium text-[#DC2626]">AI Speaking</span>
        </div>
      )}

      {/* Listening indicator */}
      {isListening && !isUserSpeaking && turnState !== 'ai' && (
        <div className="flex items-center gap-2 justify-end">
          <span className="text-xs font-medium text-[#EAB308]">Listening</span>
          <span className="w-2 h-2 rounded-full bg-[#EAB308] animate-pulse" />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default CockpitChatStream;
