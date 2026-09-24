import React, { useEffect, useRef } from 'react';
import { Message, CoachFeedbackContent } from '@/hooks/useInterviewSession';

interface CockpitChatStreamProps {
  messages: Message[];
  turnState: 'user' | 'ai' | 'idle';
  isListening: boolean;
  isProcessing: boolean;
  accumulatedTranscript?: string;
}

// 3x3 grid of 3.5px dots in #DC2626, opacity 0.7
const SparkleIcon: React.FC = () => (
  <div
    className="grid grid-cols-3 gap-[2px] mb-[6px]"
    style={{ width: 'fit-content', opacity: 0.7 }}
  >
    {Array.from({ length: 9 }).map((_, i) => (
      <div
        key={i}
        style={{
          width: 3.5,
          height: 3.5,
          borderRadius: '50%',
          backgroundColor: '#DC2626',
        }}
      />
    ))}
  </div>
);

// Animated pulse dot
const PulseDot: React.FC<{ color: string }> = ({ color }) => (
  <span className="relative inline-flex items-center justify-center" style={{ width: 10, height: 10 }}>
    <span
      className="animate-ping absolute inline-flex rounded-full opacity-60"
      style={{ backgroundColor: color, width: 8, height: 8 }}
    />
    <span
      className="relative inline-flex rounded-full"
      style={{ backgroundColor: color, width: 5, height: 5 }}
    />
  </span>
);

type StatusType = 'listening' | 'speaking' | 'processing' | null;

function deriveStatus(
  isProcessing: boolean,
  turnState: 'user' | 'ai' | 'idle',
  isListening: boolean
): StatusType {
  if (isProcessing) return 'processing';
  if (turnState === 'ai') return 'speaking';
  if (isListening) return 'listening';
  return null;
}

const CockpitChatStream: React.FC<CockpitChatStreamProps> = ({
  messages,
  turnState,
  isListening,
  isProcessing,
  accumulatedTranscript,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, turnState, isListening, isProcessing, accumulatedTranscript]);

  // Filter: only string content, exclude coach messages
  const visibleMessages = messages.filter(
    (m) =>
      typeof m.content === 'string' &&
      m.agent !== 'coach'
  );

  const status = deriveStatus(isProcessing, turnState, isListening);

  // Determine if a message is "older" AI message (not the last AI message)
  const lastAiIndex = (() => {
    for (let i = visibleMessages.length - 1; i >= 0; i--) {
      if (visibleMessages[i].role === 'assistant') return i;
    }
    return -1;
  })();

  return (
    <div
      style={{
        maxWidth: 560,
        maxHeight: 'calc(100vh - 320px)',
        overflowY: 'auto',
        // Fade top 15% with mask
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)',
      }}
      className="flex flex-col gap-3 w-full px-2 py-2"
    >
      {visibleMessages.map((msg, idx) => {
        const isAssistant = msg.role === 'assistant';
        const isOldAi = isAssistant && idx !== lastAiIndex;
        const content = msg.content as string;

        if (isAssistant) {
          return (
            <div
              key={idx}
              className="flex flex-col items-start"
              style={{ opacity: isOldAi ? 0.18 : 1, transition: 'opacity 0.3s' }}
            >
              <SparkleIcon />
              <p
                style={{
                  fontSize: 15,
                  color: '#e4e4e4',
                  lineHeight: 1.6,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {content}
              </p>
            </div>
          );
        }

        // User message — right-aligned pill
        return (
          <div key={idx} className="flex justify-end">
            <div
              style={{
                fontSize: 14,
                color: '#e4e4e4',
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                padding: '8px 14px',
                maxWidth: '80%',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {content}
            </div>
          </div>
        );
      })}

      {/* Live accumulated transcript — italic gold pill when listening */}
      {isListening && accumulatedTranscript && (
        <div className="flex justify-end">
          <div
            style={{
              fontSize: 14,
              color: '#EAB308',
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '8px 14px',
              maxWidth: '80%',
              fontStyle: 'italic',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {accumulatedTranscript}
          </div>
        </div>
      )}

      {/* Status pill */}
      {status === 'listening' && (
        <div className="flex justify-end items-center gap-2">
          <PulseDot color="#EAB308" />
          <span
            style={{
              fontSize: 12,
              color: '#EAB308',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Listening
          </span>
        </div>
      )}

      {status === 'speaking' && (
        <div className="flex justify-start items-center gap-2">
          <PulseDot color="#DC2626" />
          <span
            style={{
              fontSize: 12,
              color: '#DC2626',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Speaking
          </span>
        </div>
      )}

      {status === 'processing' && (
        <div className="flex justify-start items-center gap-2">
          <PulseDot color="rgba(255,255,255,0.35)" />
          <span
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.35)',
              fontStyle: 'italic',
              letterSpacing: '0.05em',
            }}
          >
            Processing…
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default CockpitChatStream;
