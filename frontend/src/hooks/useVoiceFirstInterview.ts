import { useState, useRef, useCallback, useEffect } from 'react';
import { Message } from './useInterviewSession';
import { api, StreamingSpeechRecognition } from '../services/api';
import { useToast } from './use-toast';
import { StreamingAudioPlayer } from '../utils/streamingAudioPlayer';

export type VoiceState = {
  microphoneState: 'idle' | 'listening' | 'processing' | 'disabled';
  audioState: 'idle' | 'playing' | 'buffering';
  turnState: 'user' | 'ai' | 'idle';
  audioPlaying: boolean; // Move audioPlaying into voiceState for atomic updates
  voiceActivity: {
    isDetected: boolean;
    volume: number; // 0-1 for glow intensity
    timestamp: number;
  };
};

export interface ExtendedInterviewState {
  voiceState: VoiceState;
  microphoneActive: boolean;
  audioPlaying: boolean;
  transcriptVisible: boolean;
  coachFeedbackVisible: boolean;
  lastExchange: {
    userMessage?: string;
    aiMessage?: string;
  };
}

// Interface for session data that will be passed as parameters
export interface SessionData {
  messages: Message[];
  isLoading: boolean;
  state: string;
  selectedVoice: string | null;
  sessionId?: string; // Add sessionId for speech task tracking
  results?: any; // Add results field
  disableAutoTTS?: boolean; // Add flag to disable auto-TTS when needed
}

export function useVoiceFirstInterview(
  sessionData: SessionData,
  onSendMessage?: (message: string) => void,
  onEndInterview?: () => void
) {
  const { toast } = useToast();
  
  // Extended voice-first state
  const [voiceState, setVoiceState] = useState<VoiceState>({
    microphoneState: 'idle',
    audioState: 'idle',
    turnState: 'idle',
    audioPlaying: false, // Moved into voiceState for atomic updates
    voiceActivity: {
      isDetected: false,
      volume: 0,
      timestamp: Date.now()
    }
  });
  
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [coachFeedbackVisible, setCoachFeedbackVisible] = useState(false);
  const [voiceActivityLevel, setVoiceActivityLevel] = useState(0);
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  
  // Track current interim text for race condition fix (not for display)
  const [currentInterimText, setCurrentInterimText] = useState('');
  
  // Refs for voice management
  const recognitionRef = useRef<StreamingSpeechRecognition | null>(null);
  const browserRecognitionRef = useRef<any>(null);
  const voiceActivityRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioPlayerRef = useRef<StreamingAudioPlayer | null>(null);
  
  // Use refs to avoid closure issues
  const accumulatedTranscriptRef = useRef(accumulatedTranscript);
  const onSendMessageRef = useRef(onSendMessage);
  
  // Ref for current interim text (for race condition fix)
  const currentInterimTextRef = useRef(currentInterimText);
  
  // Get last exchange messages for minimal display
  const getLastExchange = useCallback(() => {
    const { messages } = sessionData;
    const userMessages = messages.filter(m => m.role === 'user');
    const aiMessages = messages.filter(m => m.role === 'assistant' && m.agent !== 'coach');
    
    const lastUserMessage = userMessages[userMessages.length - 1]?.content;
    const lastAIMessage = aiMessages[aiMessages.length - 1]?.content;
    
    return {
      userMessage: typeof lastUserMessage === 'string' ? lastUserMessage : '',
      aiMessage: typeof lastAIMessage === 'string' ? lastAIMessage : ''
    };
  }, [sessionData.messages]);

  // Voice activity detection setup
  const setupVoiceActivityDetection = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Reuse the existing active media stream from recognition to prevent hardware device contention
      let stream = recognitionRef.current?.getMediaStream();
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: true 
          } 
        });
      }
      
      micStreamRef.current = stream;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      source.connect(analyserRef.current);
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateVoiceActivity = () => {
        if (analyserRef.current && microphoneActive) {
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate average volume
          const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
          const normalizedVolume = Math.min(1, average / 128);
          
          voiceActivityRef.current = normalizedVolume;
          setVoiceActivityLevel(normalizedVolume);
          
          setVoiceState(prev => ({
            ...prev,
            voiceActivity: {
              isDetected: normalizedVolume > 0.1,
              volume: normalizedVolume,
              timestamp: Date.now()
            }
          }));
        }
        
        if (microphoneActive) {
          requestAnimationFrame(updateVoiceActivity);
        }
      };
      
      updateVoiceActivity();
      
    } catch (error) {
      console.error('Error setting up voice activity detection:', error);
      toast({
        title: 'Microphone Error',
        description: 'Could not access your microphone for voice activity detection.',
        variant: 'destructive',
      });
    }
  }, [microphoneActive, toast]);

  // Start streaming voice recognition
  const startVoiceRecognition = useCallback(async () => {
    try {
      setVoiceState(prev => ({
        ...prev,
        microphoneState: 'listening',
        turnState: 'user'
      }));

      // Clear any previous accumulated transcript when starting fresh
      setAccumulatedTranscript('');
      
      // Clear any previous interim text
      setCurrentInterimText('');
      
      // Initialize real-time streaming audio player
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new StreamingAudioPlayer((isPlaying) => {
          recognitionRef.current?.setAiSpeaking(isPlaying);
          setVoiceState(prev => ({
            ...prev,
            audioPlaying: isPlaying,
            audioState: isPlaying ? 'playing' : 'idle',
            turnState: isPlaying ? 'ai' : prev.turnState === 'ai' ? 'idle' : prev.turnState
          }));
        });
      }
      // Unlock audio player context on user activation
      await audioPlayerRef.current.unlock();

      // Start Browser Web Speech Recognition for instant, 100% reliable local transcription
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          if (browserRecognitionRef.current) {
            try { browserRecognitionRef.current.stop(); } catch (e) {}
          }
          const recognizer = new SpeechRecognitionClass();
          recognizer.continuous = true;
          recognizer.interimResults = true;
          recognizer.lang = 'en-US';

          recognizer.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
              } else {
                interimTranscript += transcript;
              }
            }

            if (finalTranscript.trim()) {
              setAccumulatedTranscript(prev => (prev ? prev + ' ' + finalTranscript.trim() : finalTranscript.trim()));
              setCurrentInterimText('');
              console.log('🎤 Candidate speech transcribed:', finalTranscript.trim());
            } else if (interimTranscript.trim()) {
              setCurrentInterimText(interimTranscript.trim());
            }
          };

          recognizer.onerror = (event: any) => {
            console.debug('Browser speech recognition notice:', event.error);
          };

          recognizer.start();
          browserRecognitionRef.current = recognizer;
        } catch (e) {
          console.debug('Browser speech recognition error:', e);
        }
      }

      // Create streaming recognition instance
      recognitionRef.current = api.createStreamingSpeechRecognition({
        sessionId: sessionData.sessionId,
        onConnected: () => {
          console.log('Connected to real-time streaming voice service');
          setMicrophoneActive(true);
          setupVoiceActivityDetection();
        },
        onDisconnected: () => {
          console.log('Disconnected from voice service');
          setMicrophoneActive(false);
          setVoiceState(prev => ({
            ...prev,
            microphoneState: 'idle',
            turnState: 'idle'
          }));
        },
        onTranscript: (text, isFinal, role) => {
          if (text && text.trim() !== '') {
            // STRICT FILTER: AI interviewer transcripts must never be accumulated into the candidate's answer!
            if (role === 'assistant') {
              return;
            }
            if (isFinal) {
              setAccumulatedTranscript(prev => {
                const newText = prev.trim() ? prev + ' ' + text : text;
                console.log('📝 Final [user] transcript accumulated:', text);
                return newText;
              });
              setCurrentInterimText('');
            } else {
              setCurrentInterimText(text);
              console.log('📝 Interim [user] transcript:', text);
            }
          }
        },
        onAudioChunk: (base64Audio) => {
          // Notify recognition that AI is outputting audio so microphone transmission is gated
          if (recognitionRef.current) {
            recognitionRef.current.setAiSpeaking(true);
          }
          if (audioPlayerRef.current) {
            audioPlayerRef.current.playChunk(base64Audio);
          }
          setVoiceState(prev => ({
            ...prev,
            audioState: 'playing',
            turnState: 'ai',
            audioPlaying: true
          }));
        },
        onBargeIn: () => {
          console.log('🛑 Barge-in: candidate interrupted interviewer audio');
          if (recognitionRef.current) {
            recognitionRef.current.setAiSpeaking(false);
          }
          if (audioPlayerRef.current) {
            audioPlayerRef.current.stop();
          }
          setVoiceState(prev => ({
            ...prev,
            audioState: 'idle',
            turnState: 'user',
            audioPlaying: false
          }));
        },
        onTurnEnded: (stopReason) => {
          console.log('🔄 Turn ended:', stopReason, '-> resetting to user turn');
          // AI finished its turn — ensure mic is fully open for candidate
          if (recognitionRef.current) {
            recognitionRef.current.setAiSpeaking(false);
          }
          setVoiceState(prev => ({
            ...prev,
            turnState: prev.audioPlaying ? 'ai' : 'user',
            audioState: prev.audioPlaying ? prev.audioState : 'idle'
          }));
        },
        onInterviewEnding: () => {
          console.log('🏁 Backend signaled interview ending -> transitioning to scorecard');
          // Allow brief pause for final speech playback before transitioning
          setTimeout(() => {
            onEndInterview?.();
          }, 2500);
        },
        onSpeechStarted: () => {
          setVoiceState(prev => ({
            ...prev,
            voiceActivity: {
              ...prev.voiceActivity,
              isDetected: true
            }
          }));
        },
        onUtteranceEnd: () => {
          setTimeout(() => {
            setVoiceState(prev => ({
              ...prev,
              voiceActivity: {
                ...prev.voiceActivity,
                isDetected: false
              }
            }));
          }, 1000);
        },
        onError: (error) => {
          console.error('Nova Sonic stream error:', error);
          toast({
            title: 'Voice Service Notice',
            description: error || 'A voice service notification occurred',
            variant: 'default',
          });
          stopVoiceRecognition();
        },
      });
      
      // Start recognition
      await recognitionRef.current.start();
      
    } catch (error) {
      console.error('Failed to start streaming recognition:', error);
      toast({
        title: 'Microphone Error',
        description: 'Could not access your microphone or connect to the speech service.',
        variant: 'destructive',
      });
      stopVoiceRecognition();
    }
  }, [setupVoiceActivityDetection, toast]);

  // Stop voice recognition and handle transcript
  const stopVoiceRecognition = useCallback(() => {
    console.log('🛑 Stopping voice recognition...');
    
    // Stop browser speech recognition
    if (browserRecognitionRef.current) {
      try {
        browserRecognitionRef.current.stop();
      } catch (e) {}
      browserRecognitionRef.current = null;
    }

    // IMMEDIATE PROCESSING STATE - Show processing state right away
    setVoiceState(prev => ({
      ...prev,
      microphoneState: 'processing',
      turnState: 'idle'
    }));
    
    // Clean up WebSocket connection and audio streams
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    setMicrophoneActive(false);
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    // CHANGED: Use ref to get latest value without dependency issues
    // Combine accumulated final transcript with current interim text
    const finalText = accumulatedTranscriptRef.current.trim();
    const interimText = currentInterimTextRef.current.trim();
    
    let completeTranscript = '';
    if (finalText && interimText) {
      completeTranscript = finalText + ' ' + interimText;
    } else if (finalText) {
      completeTranscript = finalText;
    } else if (interimText) {
      completeTranscript = interimText;
    }
    
    if (completeTranscript) {
      console.log('📤 Sending complete transcript on manual stop:', completeTranscript);
      
      // Processing state already set above - maintain it until TTS starts
      if (onSendMessageRef.current) {
        onSendMessageRef.current(completeTranscript);
      } else {
        console.log('📝 Complete transcript ready:', completeTranscript);
      }
      setAccumulatedTranscript('');
      setCurrentInterimText('');
    } else {
      console.log('⚠️ No transcript to send - user may have stopped without speaking');
      // Brief delay to show processing, then return to idle
      setTimeout(() => {
        setVoiceState(prev => ({
          ...prev,
          microphoneState: 'idle',
          turnState: 'idle'
        }));
      }, 500); // 500ms delay to show processing briefly
    }
    
    // NOTE: Processing state continues until TTS audio starts playing
  }, []); // NO DEPENDENCIES - use refs instead

  // Voice control functions
  const toggleMicrophone = useCallback(async () => {
    if (microphoneActive) {
      stopVoiceRecognition();
    } else {
      await startVoiceRecognition();
    }
  }, [microphoneActive, startVoiceRecognition, stopVoiceRecognition]);

  // TTS state management - SIMPLIFIED: Remove complex initial vs regular branching
  const handleTTSStart = useCallback(() => {
    console.log('🎙️ TTS Start - Setting buffering state during synthesis');
    
    setVoiceState(prev => ({
      ...prev,
      audioState: 'buffering' as const,
      microphoneState: 'processing' as const, // Keep processing during synthesis
      // turnState remains current value until audio actually plays
    }));
  }, []);

  const handleTTSEnd = useCallback(() => {
    console.log('🎙️ TTS End - Resetting to idle state');
    setVoiceState(prev => ({
      ...prev,
      audioState: 'idle' as const,
      turnState: 'idle' as const,
      microphoneState: 'idle' as const,
      audioPlaying: false
    }));
  }, []);

  // REMOVED: handleInitialTTSPlay - no longer needed with unified approach

  // Transcript and feedback controls
  const toggleTranscript = useCallback(() => {
    setTranscriptVisible(prev => !prev);
  }, []);

  const toggleCoachFeedback = useCallback(() => {
    setCoachFeedbackVisible(prev => !prev);
  }, []);

  const closeCoachFeedback = useCallback(() => {
    setCoachFeedbackVisible(false);
  }, []);

  // High-performance speech synthesis for clear, loud AI vocal responses
  const speakText = useCallback((text: string) => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel();

      // Clean markdown formatting before speaking
      const cleanText = text.replace(/[*_#`]/g, '').trim();
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Jenny') || v.name.includes('Guy') || v.name.includes('Samantha') || v.name.includes('David') || v.name.includes('Zira') || v.name.includes('English')) && v.lang.startsWith('en')
      ) || voices.find(v => v.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        console.log('🗣️ AI Spoken Response Started:', cleanText.slice(0, 50));
        recognitionRef.current?.setAiSpeaking(true);
        setVoiceState(prev => ({
          ...prev,
          audioPlaying: true,
          audioState: 'playing',
          turnState: 'ai'
        }));
      };

      utterance.onend = () => {
        console.log('🗣️ AI Spoken Response Concluded');
        recognitionRef.current?.setAiSpeaking(false);
        setVoiceState(prev => ({
          ...prev,
          audioPlaying: false,
          audioState: 'idle',
          turnState: 'user'
        }));
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis notice:', e);
        recognitionRef.current?.setAiSpeaking(false);
        setVoiceState(prev => ({
          ...prev,
          audioPlaying: false,
          audioState: 'idle',
          turnState: 'user'
        }));
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Failed to speak text:', e);
    }
  }, []);

  const playTextToSpeech = useCallback(async (text: string) => {
    speakText(text);
  }, [speakText]);

  // Auto-enable voice when new AI message arrives
  const { messages, disableAutoTTS } = sessionData;
  const lastMessage = messages[messages.length - 1];
  const lastProcessedMessageRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (disableAutoTTS) return;
    
    if (lastMessage && 
        lastMessage.role === 'assistant' && 
        lastMessage.agent !== 'coach' &&
        typeof lastMessage.content === 'string' &&
        lastMessage.content.trim()) {
      
      const messageKey = `${messages.length - 1}-${lastMessage.content.slice(0, 50)}`;
      
      if (messageKey !== lastProcessedMessageRef.current) {
        lastProcessedMessageRef.current = messageKey;
        console.log('🔊 Auto-speaking AI message aloud:', lastMessage.content.slice(0, 50));
        speakText(lastMessage.content);
      }
    }
  }, [lastMessage, disableAutoTTS, speakText, messages.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVoiceRecognition();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.close();
        audioPlayerRef.current = null;
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, [stopVoiceRecognition]);

  // Determine overall interaction state
  const getInteractionState = useCallback(() => {
    const sessionNotReady = sessionData.state !== 'interviewing';
    const isAISpeaking = voiceState.audioPlaying && voiceState.turnState === 'ai';
    
    // Mic is disabled only when session not ready or AI is speaking
    const disabled = sessionNotReady || isAISpeaking;
    
    return {
      isListening: microphoneActive && !disabled,
      isProcessing: voiceState.microphoneState === 'processing' && !disabled,
      isDisabled: disabled
    };
  }, [voiceState, microphoneActive, sessionData.state]);

  // Calculate interaction state once
  const interactionState = getInteractionState();

  // Update refs when values change
  useEffect(() => {
    accumulatedTranscriptRef.current = accumulatedTranscript;
  }, [accumulatedTranscript]);
  
  useEffect(() => {
    currentInterimTextRef.current = currentInterimText;
  }, [currentInterimText]);
  
  useEffect(() => {
    onSendMessageRef.current = onSendMessage;
  }, [onSendMessage]);

  return {
    // Selected interview session functionality (avoid spreading entire object)
    messages: sessionData.messages,
    isLoading: sessionData.isLoading,
    state: sessionData.state,
    results: sessionData.results,
    selectedVoice: sessionData.selectedVoice,
    // Note: coachFeedbackStates and actions excluded to prevent re-render loops
    
    // Extended voice-first state
    voiceState,
    microphoneActive,
    audioPlaying: voiceState.audioPlaying, // Extract audioPlaying from voiceState for backward compatibility
    transcriptVisible,
    coachFeedbackVisible,
    voiceActivityLevel,
    accumulatedTranscript,
    
    // Enhanced interaction state (don't spread to avoid re-creation)
    isListening: interactionState.isListening,
    isProcessing: interactionState.isProcessing,
    isDisabled: interactionState.isDisabled,
    
    // Voice control actions
    toggleMicrophone,
    toggleTranscript,
    toggleCoachFeedback,
    closeCoachFeedback,
    handleTTSStart,
    handleTTSEnd,
    
    // Enhanced TTS
    playTextToSpeech,
    
    // Computed values
    lastExchange: getLastExchange(),
    turnState: voiceState.turnState
  };
}

// Re-export types for convenience
export type { Message, CoachFeedbackState } from './useInterviewSession'; 