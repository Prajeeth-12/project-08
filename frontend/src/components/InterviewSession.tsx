import React, { useState, useEffect, useRef } from 'react';
import CockpitChatStream from './CockpitChatStream';
import CockpitAudioWave from './CockpitAudioWave';
import { DevTextInput } from './DevTextInput';
import TranscriptDrawer from './TranscriptDrawer';
import InterviewInstructionsModal from './InterviewInstructionsModal';
import { SessionWarningDialog } from './SessionWarningDialog';
import { useVoiceFirstInterview } from '../hooks/useVoiceFirstInterview';
import { Message, CoachFeedbackState } from '@/hooks/useInterviewSession';
import { Button } from '@/components/ui/button';
import { Mic, MessageSquare, Clock, Keyboard, Send, AlertTriangle } from 'lucide-react';

interface InterviewSessionProps {
  interviewDurationMinutes?: number;
  sessionId?: string;
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onEndInterview: () => void;
  onVoiceSelect: (voiceId: string | null) => void;
  coachFeedbackStates: CoachFeedbackState;
  showSessionWarning: boolean;
  sessionTimeRemaining: number | null;
  onExtendSession: () => void;
  onSessionTimeout: () => void;
}

const InterviewSession: React.FC<InterviewSessionProps> = ({
  interviewDurationMinutes = 10,
  sessionId,
  messages,
  isLoading,
  onSendMessage,
  onEndInterview,
  onVoiceSelect,
  coachFeedbackStates,
  showSessionWarning,
  sessionTimeRemaining,
  onExtendSession,
  onSessionTimeout,
}) => {
  const [showInstructions, setShowInstructions] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [sessionStartTime] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [devInputOpen, setDevInputOpen] = useState(false);
  const [devText, setDevText] = useState('');
  const defaultVoiceSetRef = useRef(false);
  const autoEndedRef = useRef(false);

  const {
    voiceActivityLevel,
    accumulatedTranscript,
    isListening,
    isProcessing,
    isDisabled,
    turnState,
    audioPlaying,
    startVoiceSession,
    stopVoiceSession,
  } = useVoiceFirstInterview(
    { messages, isLoading, state: 'interviewing', selectedVoice, sessionId, disableAutoTTS: showInstructions },
    onSendMessage,
    onEndInterview,
  );

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-enable voice on mount
  useEffect(() => {
    if (!defaultVoiceSetRef.current) {
      setSelectedVoice('enabled');
      onVoiceSelect('enabled');
      defaultVoiceSetRef.current = true;
    }
  }, []);

  // Countdown timer
  const totalSeconds = interviewDurationMinutes * 60;
  const elapsed = Math.floor((currentTime - sessionStartTime) / 1000);
  const remaining = Math.max(0, totalSeconds - elapsed);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const isLowTime = remaining < 120 && remaining > 0;
  const isExpired = remaining === 0;

  // Auto-end interview and transition to post-interview report when time reaches 00:00
  useEffect(() => {
    if (isExpired && !autoEndedRef.current) {
      autoEndedRef.current = true;
      console.log('⏰ Time expired (00:00) -> automatically concluding interview');
      onEndInterview();
    }
  }, [isExpired, onEndInterview]);

  const handleInstructionsDismiss = () => {
    setShowInstructions(false);
    // Start persistent voice session on user gesture (required for AudioContext unlock)
    startVoiceSession();
  };

  const handleDevSend = () => {
    const trimmed = devText.trim();
    if (trimmed && !isLoading) {
      onSendMessage(trimmed);
      setDevText('');
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-white via-white to-[#FEF3C7]/30">

      {/* ── Top Bar ── */}
      <div className="fixed top-0 left-0 right-0 flex justify-between items-center px-5 sm:px-8 py-3 z-20 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[13px] font-bold font-mono transition-colors ${
          isExpired ? 'border-[#DC2626] text-[#DC2626] bg-red-50' :
          isLowTime ? 'border-[#DC2626] text-[#DC2626] bg-red-50 animate-pulse' :
          'border-[#EAB308] text-[#92400E] bg-[#FEF3C7]/50'
        }`}>
          <Clock size={14} />
          <span>{mm}:{ss}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowEndConfirm(true)}
          className="border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626] hover:text-white font-semibold text-xs rounded-lg px-4"
        >
          End Interview
        </Button>
      </div>

      {/* ── Chat Stream ── */}
      <div className="fixed inset-0 flex flex-col justify-end items-center z-10" style={{ padding: '64px 0 220px 0' }}>
        <CockpitChatStream
          messages={messages}
          turnState={turnState}
          isListening={isListening}
          isProcessing={isProcessing}
          accumulatedTranscript={accumulatedTranscript}
        />
      </div>

      {/* ── WebGL Audio Wave ── */}
      <CockpitAudioWave
        turnState={turnState}
        isListening={isListening}
        isProcessing={isProcessing}
        voiceActivity={voiceActivityLevel}
      />

      {/* ── Dev Text Input Bar ── */}
      {devInputOpen && (
        <div className="fixed bottom-[76px] left-1/2 -translate-x-1/2 z-[25] w-full max-w-xl px-4">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <input
              type="text"
              value={devText}
              onChange={(e) => setDevText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleDevSend(); }}
              placeholder="Type your response here..."
              autoFocus
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm text-[#111827] placeholder-[#9CA3AF] outline-none"
            />
            <button
              onClick={handleDevSend}
              disabled={!devText.trim() || isLoading}
              className="w-9 h-9 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
            >
              <Send size={15} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ── Control Dock ── */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1.5 rounded-2xl bg-white border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
        {/* Mic status indicator — always on, not toggleable */}
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
            turnState === 'ai'
              ? 'bg-amber-100 text-amber-600 border border-amber-300'
              : isListening
              ? 'bg-[#DC2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-gray-100 text-gray-400 border border-gray-200'
          }`}
          title={turnState === 'ai' ? "AI is speaking..." : isListening ? "Listening..." : "Connecting..."}
        >
          <Mic size={18} />
        </div>

        <button
          onClick={() => setTranscriptOpen(!transcriptOpen)}
          title="Toggle transcript"
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
            transcriptOpen
              ? 'bg-[#FEF3C7] text-[#92400E] border border-[#EAB308]'
              : 'bg-gray-50 text-[#6B7280] hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <MessageSquare size={18} />
        </button>

        <button
          onClick={() => setDevInputOpen(!devInputOpen)}
          title="Toggle text input"
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
            devInputOpen
              ? 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30'
              : 'bg-gray-50 text-[#6B7280] hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Keyboard size={18} />
        </button>
      </div>

      {/* ── Transcript Drawer ── */}
      <TranscriptDrawer
        isOpen={transcriptOpen}
        messages={messages}
        onClose={() => setTranscriptOpen(false)}
        onSendTextFromTranscript={onSendMessage}
        coachFeedbackStates={coachFeedbackStates}
      />

      {/* ── Instructions Modal ── */}
      {showInstructions && (
        <InterviewInstructionsModal
          isOpen={showInstructions}
          onClose={handleInstructionsDismiss}
        />
      )}

      {/* ── End Confirm Modal ── */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                <AlertTriangle size={18} className="text-[#DC2626]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111827]">End Interview?</h3>
                <p className="text-xs text-[#6B7280]">Your session will be evaluated.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowEndConfirm(false)} className="text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={() => { setShowEndConfirm(false); onEndInterview(); }} className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs">
                End Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Session Warning ── */}
      <SessionWarningDialog
        open={showSessionWarning}
        timeRemaining={sessionTimeRemaining}
        onExtend={onExtendSession}
        onEndNow={() => { onSessionTimeout(); }}
      />
    </div>
  );
};

export default InterviewSession;
