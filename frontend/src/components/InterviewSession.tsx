import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import VoiceFirstInterviewPanel from './VoiceFirstInterviewPanel';
import TranscriptDrawer from './TranscriptDrawer';
import InterviewInstructionsModal from './InterviewInstructionsModal';
import { SessionWarningDialog } from './SessionWarningDialog';
import { useVoiceFirstInterview } from '../hooks/useVoiceFirstInterview';
import { useIsMobile } from '@/hooks/use-mobile';
import { Message, CoachFeedbackState } from '@/hooks/useInterviewSession';
import {
  X, ChevronLeft, ChevronRight, Mic, MicOff, Brain, Activity,
  MessageCircle, Timer, Sparkles, Zap, Volume2, VolumeX,
  Target, Circle, Square, Triangle, Hexagon, Loader2
} from 'lucide-react';

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
  // Enhanced state management
  const isMobile = useIsMobile();
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [ambientIntensity, setAmbientIntensity] = useState(0.4);
  const [sessionStartTime] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; vx: number; vy: number; size: number; color: string; life: number }>>([]);
  const [showCoachNotification, setShowCoachNotification] = useState(false);
  const [lastFeedbackCount, setLastFeedbackCount] = useState(0);
  const [latestFeedbackToggled, setLatestFeedbackToggled] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const defaultVoiceSetRef = useRef(false);

  // Initialize voice-first interview system
  const {
    voiceState,
    microphoneActive,
    audioPlaying,
    transcriptVisible,
    voiceActivityLevel,
    accumulatedTranscript,
    isListening,
    isProcessing,
    isDisabled,
    turnState,
    toggleMicrophone,
    toggleTranscript,
    playTextToSpeech,
    lastExchange
  } = useVoiceFirstInterview(
    {
      messages,
      isLoading,
      state: 'interviewing',
      selectedVoice,
      sessionId,
      disableAutoTTS: showInstructions,
    }, 
    onSendMessage
  );

  // Enhanced mouse tracking for 3D effects
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  // Time tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic ambient intensity based on interview state
  useEffect(() => {
    if (turnState === 'ai' || audioPlaying) {
      setAmbientIntensity(0.8);
    } else if (isListening) {
      setAmbientIntensity(0.6 + (voiceActivityLevel || 0) * 0.4);
    } else if (isProcessing) {
      setAmbientIntensity(0.7);
    } else {
      setAmbientIntensity(0.4);
    }
  }, [turnState, audioPlaying, isListening, voiceActivityLevel, isProcessing]);

  // Advanced particle system
  useEffect(() => {
    if (isListening || turnState === 'ai' || isProcessing) {
      const particleCount = turnState === 'ai' ? 12 : 8;
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        color: turnState === 'ai' ? 'orange' : isListening ? 'cyan' : 'purple',
        life: 1
      }));
      setParticles(newParticles);
      
      const animationInterval = setInterval(() => {
        setParticles(prev => prev.map(p => ({
          ...p,
          x: (p.x + p.vx + 100) % 100,
          y: (p.y + p.vy + 100) % 100,
          life: Math.max(0, p.life - 0.02)
        })).filter(p => p.life > 0));
      }, 50);
      
      return () => clearInterval(animationInterval);
    } else {
      setParticles([]);
    }
  }, [isListening, turnState, isProcessing]);

  // Auto-enable voice on component mount
  useEffect(() => {
    if (!defaultVoiceSetRef.current) {
      setSelectedVoice('enabled');
      onVoiceSelect('enabled');
      defaultVoiceSetRef.current = true;
    }
  }, []);

  // Track coach feedback and show notifications
  useEffect(() => {
    const feedbackEntries = Object.values(coachFeedbackStates);
    const completedFeedback = feedbackEntries.filter(state => state.feedback && !state.isAnalyzing).length;
    
    if (completedFeedback > lastFeedbackCount) {
      setShowCoachNotification(true);
      setLastFeedbackCount(completedFeedback);
      
      // Hide notification after 2 seconds
      setTimeout(() => {
        setShowCoachNotification(false);
      }, 2000);
    }
  }, [coachFeedbackStates, lastFeedbackCount]);

  // Enhanced microphone toggle
  const handleMicrophoneToggle = () => {
    toggleMicrophone();
  };

  // Find the latest user message with coach feedback
  const getLatestFeedbackMessageIndex = () => {
    const userMessageIndexes = messages
      .map((msg, index) => ({ msg, index }))
      .filter(({ msg }) => msg.role === 'user')
      .map(({ index }) => index)
      .reverse(); // Start from latest

    for (const messageIndex of userMessageIndexes) {
      const feedbackState = coachFeedbackStates[messageIndex];
      if (feedbackState?.feedback && !feedbackState.isAnalyzing) {
        return messageIndex;
      }
    }
    return null;
  };

  // Handle coach icon button click
  const handleCoachButtonClick = () => {
    const latestFeedbackIndex = getLatestFeedbackMessageIndex();
    
    if (latestFeedbackIndex === null) {
      // No feedback available yet
      return;
    }

    // If transcript is not visible, open it first
    if (!transcriptVisible) {
      toggleTranscript();
      // Wait a bit for the drawer to open, then toggle feedback
      setTimeout(() => {
        setLatestFeedbackToggled(!latestFeedbackToggled);
      }, 300);
    } else {
      // Transcript is already open, just toggle the feedback
      setLatestFeedbackToggled(!latestFeedbackToggled);
      }
  };

  // Reset latest feedback toggle when transcript is closed
  useEffect(() => {
    if (!transcriptVisible) {
      setLatestFeedbackToggled(false);
    }
  }, [transcriptVisible]);

  // Calculate session duration
  const sessionDuration = Math.floor((currentTime - sessionStartTime) / 1000);
  const minutes = Math.floor(sessionDuration / 60);
  const seconds = sessionDuration % 60;

  // Get current question count
  const questionCount = messages.filter(m => m.role === 'assistant' && m.agent === 'interviewer').length;
  const responseCount = messages.filter(m => m.role === 'user').length;

  // Advanced background system
  const renderAdvancedBackground = () => (
    <div className="absolute inset-0 overflow-hidden">
      {/* Primary ambient gradient */}
      <div 
        className="absolute inset-0 transition-all duration-1000 ease-out"
        style={{
          background: `
            radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, 
              rgba(220, 38, 38, ${ambientIntensity * 0.15}) 0%, 
              rgba(234, 179, 8, ${ambientIntensity * 0.08}) 30%, 
              transparent 70%),
            radial-gradient(circle at ${100 - mousePosition.x}% ${100 - mousePosition.y}%, 
              rgba(220, 38, 38, ${ambientIntensity * 0.12}) 0%, 
              rgba(254, 243, 199, ${ambientIntensity * 0.06}) 40%, 
              transparent 80%),
            linear-gradient(135deg, 
              rgba(255, 255, 255, 1) 0%, 
              rgba(254, 243, 199, 0.5) 50%, 
              rgba(255, 255, 255, 1) 100%)
          `
        }}
      />

      {/* Dynamic floating orbs based on interview state */}
      <div 
        className="absolute w-96 h-96 rounded-full opacity-30 blur-3xl transition-all duration-[4000ms] ease-in-out"
        style={{
          background: turnState === 'ai' 
            ? 'radial-gradient(circle, rgba(220, 38, 38, 0.3) 0%, rgba(220, 38, 38, 0.3) 50%, transparent 100%)'
            : isListening 
            ? 'radial-gradient(circle, rgba(220, 38, 38, 0.6) 0%, rgba(234, 179, 8, 0.3) 50%, transparent 100%)'
            : 'radial-gradient(circle, rgba(234, 179, 8, 0.4) 0%, rgba(220, 38, 38, 0.2) 50%, transparent 100%)',
          transform: `translate(${60 + mousePosition.x * 0.3}px, ${20 + mousePosition.y * 0.2}px) scale(${ambientIntensity})`,
          top: '10%',
          right: '5%',
        }}
      />
      
      <div 
        className="absolute w-80 h-80 rounded-full opacity-25 blur-2xl transition-all duration-[3000ms] ease-in-out"
        style={{
          background: isProcessing
            ? 'radial-gradient(circle, rgba(234, 179, 8, 0.5) 0%, rgba(220, 38, 38, 0.3) 50%, transparent 100%)'
            : 'radial-gradient(circle, rgba(254, 243, 199, 0.4) 0%, rgba(234, 179, 8, 0.2) 50%, transparent 100%)',
          transform: `translate(${-mousePosition.x * 0.4}px, ${-mousePosition.y * 0.3}px) scale(${0.8 + ambientIntensity * 0.4})`,
          bottom: '15%',
          left: '8%',
        }}
      />

      {/* Advanced particle system */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-1 h-1 rounded-full transition-opacity duration-500"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: particle.color === 'orange' ? '#DC2626' : particle.color === 'cyan' ? '#EAB308' : '#FEF3C7',
            opacity: particle.life * ambientIntensity,
            transform: `scale(${particle.size})`,
            boxShadow: `0 0 ${particle.size * 4}px currentColor`,
          }}
        />
      ))}

      {/* Geometric accent elements */}
      <div className="absolute top-1/4 left-1/3 opacity-20">
        <Circle className="w-3 h-3 text-[#DC2626]/20 animate-pulse" style={{ animationDelay: '0s' }} />
      </div>
      <div className="absolute top-2/3 right-1/4 opacity-15">
        <Square className="w-2 h-2 text-[#EAB308]/20 animate-bounce" style={{ animationDelay: '1s' }} />
      </div>
      <div className="absolute bottom-1/3 left-1/4 opacity-25">
        <Triangle className="w-4 h-4 text-[#DC2626]/15 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      <div className="absolute top-1/2 right-1/3 opacity-20">
        <Hexagon className="w-3 h-3 text-[#EAB308]/15 animate-bounce" style={{ animationDelay: '3s' }} />
      </div>
    </div>
  );

  // Premium floating status panel
  const renderFloatingStatusPanel = () => (
    <div className="fixed top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 z-40 space-y-1.5 sm:space-y-2 md:space-y-3">
      {/* Session info card */}
      <div className="bg-white/95 backdrop-blur-xl border border-[#E5E7EB] border-b-2 border-b-[#DC2626] rounded-xl p-2.5 sm:p-3 shadow-md hover:border-[#DC2626]/40 transition-all duration-300 group">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#DC2626] flex items-center justify-center text-white shadow-sm">
            <Timer className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-[#111827] font-mono">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <div className="text-[11px] text-[#6B7280] hidden sm:block font-medium">Session Time</div>
          </div>
        </div>
      </div>

      {/* Question counter */}
      <div className="bg-white/95 backdrop-blur-xl border border-[#E5E7EB] border-b-2 border-b-[#EAB308] rounded-xl p-2.5 sm:p-3 shadow-md hover:border-[#EAB308]/40 transition-all duration-300 group">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#EAB308] flex items-center justify-center text-[#111827] shadow-sm">
            <MessageCircle className="w-4 h-4 text-[#111827]" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-[#111827] font-mono">{questionCount}</div>
            <div className="text-[11px] text-[#6B7280] hidden sm:block font-medium">Questions</div>
          </div>
        </div>
      </div>

      {/* Current state indicator */}
      <div className="bg-white/95 backdrop-blur-xl border border-[#E5E7EB] border-b-2 border-b-[#DC2626] rounded-xl p-2.5 sm:p-3 shadow-md hover:border-[#DC2626]/40 transition-all duration-300 group">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-white shadow-sm ${
            turnState === 'ai' ? 'bg-[#EAB308]' :
            isListening ? 'bg-[#DC2626]' :
            isProcessing ? 'bg-[#92400E]' :
            'bg-[#111827]'
          }`}>
            {turnState === 'ai' ? <Volume2 className="w-4 h-4 text-[#111827]" /> :
             isListening ? <Mic className="w-4 h-4 text-white" /> :
             isProcessing ? <Brain className="w-4 h-4 text-white animate-pulse" /> :
             <Target className="w-4 h-4 text-white" />}
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-[#111827]">
              {turnState === 'ai' ? 'AI Speaking' :
               isListening ? 'Listening' :
               isProcessing ? 'Processing' :
               'Ready'}
            </div>
            <div className="text-[11px] text-[#6B7280] hidden sm:block font-medium">Status</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Advanced control panel
  const renderAdvancedControls = () => (
    <div className="fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 md:bottom-6 md:left-6 md:right-6 z-40">
      <div className="bg-white/95 backdrop-blur-xl border border-[#E5E7EB] border-b-[3px] border-b-[#EAB308] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.1)] p-3 sm:p-4 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 md:gap-0">
          {/* Left: Primary controls */}
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 order-2 sm:order-1">
            <Button
              onClick={handleMicrophoneToggle}
              disabled={isDisabled}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl shadow-[0_4px_14px_rgba(220,38,38,0.3)] transition-all duration-300 group focus:outline-none focus:ring-4 focus:ring-[#DC2626]/20 active:scale-95 min-h-[48px] ${
                isListening 
                  ? 'bg-[#B91C1C] hover:bg-[#991B1B]'
                  : 'bg-[#DC2626] hover:bg-[#B91C1C]'
              }`}
            >
              {isListening ? (
                <MicOff className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:scale-110 transition-transform" />
              ) : (
                <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:scale-110 transition-transform" />
              )}
            </Button>

            <Button
              onClick={toggleTranscript}
              variant="outline"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FAFAFA] border-[#E5E7EB] hover:border-[#DC2626] hover:bg-[#FEF3C7]/20 transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 active:scale-95 min-h-[44px]"
              aria-label={transcriptVisible ? 'Hide transcript' : 'Show transcript'}
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#4B5563] group-hover:text-[#DC2626] group-hover:scale-110 transition-all" />
            </Button>

            {/* Coach Feedback Button */}
            <div className="relative">
              <Button
                onClick={handleCoachButtonClick}
                variant="outline"
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-all duration-300 group relative min-h-[44px] ${
                  Object.values(coachFeedbackStates).some(state => state.isAnalyzing)
                    ? 'bg-[#FEF3C7] border-[#FDE68A]'
                    : 'bg-[#FAFAFA] border-[#E5E7EB] hover:border-[#EAB308] hover:bg-[#FEF3C7]/20'
                }`}
              >
                <div className="relative">
                  <Brain className={`w-4 h-4 sm:w-5 sm:h-5 transition-all ${
                    Object.values(coachFeedbackStates).some(state => state.isAnalyzing)
                      ? 'text-[#92400E]'
                      : 'text-[#4B5563] group-hover:text-[#EAB308] group-hover:scale-110'
                  }`} />
                  
                  {/* Loading spinner overlay when analyzing */}
                  {Object.values(coachFeedbackStates).some(state => state.isAnalyzing) && (
                    <Loader2 className="absolute inset-0 w-4 h-4 sm:w-5 sm:h-5 text-[#DC2626] animate-spin" />
                  )}
                </div>
              </Button>

              {/* Notification popup */}
              {showCoachNotification && (
                <div 
                  className="absolute -top-10 sm:-top-12 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in-0 zoom-in-95 duration-500"
                  style={{
                    animation: 'fadeInOut 2s ease-in-out forwards'
                  }}
                >
                  <div className="bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] rounded-lg px-2.5 py-1 shadow-md">
                    <p className="text-xs font-bold whitespace-nowrap">
                      Coach feedback ready!
                    </p>
                    {/* Arrow pointer */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#FDE68A]"></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Voice activity visualization */}
          <div className="flex-1 flex justify-center order-1 sm:order-2 mb-2 sm:mb-0">
            <div className="flex items-center space-x-2">
              {turnState === 'ai' && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs sm:text-sm text-[#92400E] font-bold">AI Speaking...</span>
                </div>
              )}
              
              {isListening && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs sm:text-sm text-[#DC2626] font-bold">Listening...</span>
                </div>
              )}
              
              {isProcessing && (
                <div className="flex items-center space-x-2">
                  <Brain className="w-4 h-4 text-[#DC2626] animate-pulse" />
                  <span className="text-xs sm:text-sm text-[#DC2626] font-bold">Processing...</span>
                </div>
              )}

              {!isListening && !isProcessing && turnState !== 'ai' && (
                <div className="flex items-center space-x-2 text-[#6B7280]">
                  <Target className="w-4 h-4 text-[#9CA3AF]" />
                  <span className="text-xs sm:text-sm font-medium">Ready to listen</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: End Interview Button */}
          <div className="flex items-center order-3">
            <Button
              onClick={onEndInterview}
              variant="outline"
              className="px-4 py-2 sm:px-5 sm:py-2.5 h-10 sm:h-11 rounded-lg bg-white border border-[#DC2626]/40 hover:border-[#DC2626] hover:bg-[#DC2626] text-[#DC2626] hover:text-white transition-all duration-300 group text-xs sm:text-sm font-bold shadow-sm"
              aria-label="End interview session"
            >
              <X className="w-4 h-4 mr-1.5 group-hover:scale-110 transition-transform" />
              <span className="hidden xs:inline sm:hidden md:inline">End Interview</span>
              <span className="xs:hidden sm:inline md:hidden">End</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Handle modal close and trigger TTS
  const handleInstructionsClose = () => {
    setShowInstructions(false);
    
    setTimeout(() => {
      const introMessage = messages.find(msg => 
        msg.role === 'assistant' && 
        msg.agent === 'interviewer' && 
        typeof msg.content === 'string'
      );
      
      if (introMessage && typeof introMessage.content === 'string') {
        playTextToSpeech(introMessage.content);
      }
    }, 100);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Advanced immersive background */}
      {renderAdvancedBackground()}
      
      {/* Floating status panels */}
      {renderFloatingStatusPanel()}

      {/* Transcript toggle - premium design */}
      <button
        onClick={toggleTranscript}
        className={`
          fixed top-1/2 -translate-y-1/2 z-30 p-3 md:p-4 
          bg-white/90 backdrop-blur-xl border border-gray-200 
          hover:border-[#DC2626]/40 hover:bg-[#FEF3C7]/50 
          shadow-md text-[#111827] transition-all duration-500 ease-out
          ${transcriptVisible ? 'left-72 sm:left-80 md:left-96 rounded-r-xl md:rounded-r-2xl' : 'left-0 rounded-r-xl md:rounded-r-2xl'}
          group
        `}
        title={transcriptVisible ? 'Hide Transcript' : 'Show Transcript'}
      >
        <div className="flex items-center space-x-1 md:space-x-2">
          {transcriptVisible ? (
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
          ) : (
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
          )}
        </div>
      </button>

      {/* Main Voice-First Interface - Enhanced */}
      <div className="relative z-20 h-full">
      <VoiceFirstInterviewPanel
        isListening={isListening}
        isProcessing={isProcessing || isLoading}
        isDisabled={isDisabled}
        voiceActivity={voiceActivityLevel}
        turnState={turnState}
        messages={messages}
        onToggleMicrophone={handleMicrophoneToggle}
        onToggleTranscript={toggleTranscript}
        showMessages={true}
        accumulatedTranscript={accumulatedTranscript}
      />
      </div>

      {/* Advanced control panel */}
      {renderAdvancedControls()}

      {/* Transcript Drawer */}
      <TranscriptDrawer
        isOpen={transcriptVisible}
        messages={messages}
        onClose={toggleTranscript}
        onPlayMessage={playTextToSpeech}
        onSendTextFromTranscript={onSendMessage}
        coachFeedbackStates={coachFeedbackStates}
        latestFeedbackToggled={latestFeedbackToggled}
        latestFeedbackIndex={getLatestFeedbackMessageIndex()}
      />

      {/* Interview Instructions Modal */}
      <InterviewInstructionsModal
        isOpen={showInstructions}
        onClose={handleInstructionsClose}
      />

      {/* Session Warning Dialog */}
      <SessionWarningDialog
        open={showSessionWarning}
        timeRemaining={sessionTimeRemaining}
        onExtend={onExtendSession}
        onEndNow={onSessionTimeout}
      />

      {/* Custom styles for coach notification animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(10px) translateX(-50%) scale(0.9); }
            20% { opacity: 1; transform: translateY(0) translateX(-50%) scale(1); }
            80% { opacity: 1; transform: translateY(0) translateX(-50%) scale(1); }
            100% { opacity: 0; transform: translateY(-5px) translateX(-50%) scale(0.95); }
          }
        `
      }} />
    </div>
  );
};

export default InterviewSession;
