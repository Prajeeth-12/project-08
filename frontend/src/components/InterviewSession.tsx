import React, { useState, useEffect } from 'react';
import CockpitChatStream from './CockpitChatStream';
import CockpitAudioWave from './CockpitAudioWave';
import { DevTextInput } from './DevTextInput';
import TranscriptDrawer from './TranscriptDrawer';
import InterviewInstructionsModal from './InterviewInstructionsModal';
import { SessionWarningDialog } from './SessionWarningDialog';
import { useVoiceFirstInterview } from '../hooks/useVoiceFirstInterview';
import { Message, CoachFeedbackState } from '@/hooks/useInterviewSession';
import { Mic, MicOff, MessageSquare, Clock, X } from 'lucide-react';

interface InterviewSessionProps {
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

  const {
    voiceActivityLevel,
    accumulatedTranscript,
    isListening,
    isProcessing,
    isDisabled,
    turnState,
    toggleMicrophone,
    playTextToSpeech,
  } = useVoiceFirstInterview(
    { messages, isLoading, state: 'interviewing', selectedVoice, sessionId, disableAutoTTS: showInstructions },
    onSendMessage,
  );

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer computation
  const elapsed = Math.floor((currentTime - sessionStartTime) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  const handleInstructionsDismiss = () => {
    setShowInstructions(false);
    const firstAI = messages.find(m => m.role === 'assistant' && m.agent === 'interviewer');
    if (firstAI && typeof firstAI.content === 'string') {
      playTextToSpeech(firstAI.content);
    }
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-black text-[#e4e4e4]"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* 1. Top bar */}
      <div className="fixed top-0 left-0 right-0 flex justify-between items-center px-6 py-[18px] z-20">
        {/* Timer pill */}
        <div className="flex items-center gap-1.5 px-3 py-[5px] rounded-full border-[1.5px] border-[#34d399] text-[#34d399] text-[13px] font-semibold font-mono">
          <Clock size={14} />
          <span>{mm}:{ss}</span>
        </div>

        {/* End interview button */}
        <button
          onClick={() => setShowEndConfirm(true)}
          className="px-5 py-[7px] rounded-[10px] border-[1.5px] border-[#f87171] bg-transparent text-[#f87171] text-[13px] font-semibold hover:bg-[#f87171]/[0.08] transition-colors"
        >
          End interview
        </button>
      </div>

      {/* 2. Content layer */}
      <div
        className="fixed inset-0 flex flex-col justify-center z-10"
        style={{ padding: '60px 0 200px 0' }}
      >
        <div className="w-full max-w-[1100px] mx-auto px-8">
          <CockpitChatStream
            messages={messages}
            turnState={turnState}
            isListening={isListening}
            isProcessing={isProcessing}
            accumulatedTranscript={accumulatedTranscript}
          />
        </div>
      </div>

      {/* 3. CockpitAudioWave — self-positioning fixed */}
      <CockpitAudioWave
        turnState={turnState}
        isListening={isListening}
        isProcessing={isProcessing}
        voiceActivity={voiceActivityLevel}
      />

      {/* 4. DevTextInput — self-positioning fixed */}
      <DevTextInput onSendMessage={onSendMessage} isLoading={isLoading} />

      {/* 5. Control dock */}
      <div className="fixed bottom-[18px] left-1/2 -translate-x-1/2 z-20 flex gap-1.5 p-1.5 rounded-[14px] border border-white/10 bg-black/45 backdrop-blur-2xl">
        {/* Mic button */}
        <button
          onClick={toggleMicrophone}
          disabled={isDisabled}
          className={`flex items-center justify-center rounded-lg border transition-colors ${
            isListening
              ? 'border-[#34d399]/50 text-[#34d399] bg-[#34d399]/10'
              : 'border-white/10 text-[#e4e4e4] hover:bg-white/5'
          }`}
          style={{ width: '40px', height: '38px' }}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {/* Transcript button */}
        <button
          onClick={() => setTranscriptOpen(!transcriptOpen)}
          className={`flex items-center justify-center rounded-lg border transition-colors ${
            transcriptOpen
              ? 'border-[#22d3ee]/50 text-[#22d3ee] bg-[#22d3ee]/10'
              : 'border-white/10 text-[#e4e4e4] hover:bg-white/5'
          }`}
          style={{ width: '40px', height: '38px' }}
        >
          <MessageSquare size={18} />
        </button>
      </div>

      {/* 6. TranscriptDrawer */}
      <TranscriptDrawer
        isOpen={transcriptOpen}
        messages={messages}
        onClose={() => setTranscriptOpen(false)}
        onSendTextFromTranscript={onSendMessage}
        coachFeedbackStates={coachFeedbackStates}
      />

      {/* 7. InterviewInstructionsModal */}
      {showInstructions && (
        <InterviewInstructionsModal
          isOpen={showInstructions}
          onClose={handleInstructionsDismiss}
        />
      )}

      {/* 8. End confirm modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4">
            <h2 className="text-[#e4e4e4] text-lg font-semibold mb-2">End Interview Session?</h2>
            <p className="text-white/40 text-sm mb-6">Your session will be saved and the interview will end.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="px-4 py-2 rounded-lg border border-white/10 text-[#e4e4e4] text-sm hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onEndInterview}
                className="px-4 py-2 rounded-lg bg-[#f87171] text-black text-sm font-semibold hover:bg-[#f87171]/80 transition-colors"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. SessionWarningDialog */}
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
