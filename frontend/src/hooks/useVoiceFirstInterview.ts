import { useState, useRef, useCallback, useEffect } from 'react';
import { Message } from './useInterviewSession';
import { api, StreamingSpeechRecognition } from '../services/api';
import { useToast } from './use-toast';
import { StreamingAudioPlayer } from '../utils/streamingAudioPlayer';

export type VoiceState = {
  microphoneState: 'idle' | 'listening' | 'processing' | 'disabled';
  audioState: 'idle' | 'playing' | 'buffering';
  turnState: 'user' | 'ai' | 'idle';
  audioPlaying: boolean;
  voiceActivity: {
    isDetected: boolean;
    volume: number;
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

export interface SessionData {
  messages: Message[];
  isLoading: boolean;
  state: string;
  selectedVoice: string | null;
  sessionId?: string;
  results?: any;
  disableAutoTTS?: boolean;
}

export function useVoiceFirstInterview(
  sessionData: SessionData,
  onSendMessage?: (message: string) => void,
  onEndInterview?: () => void
) {
  const { toast } = useToast();

  const [voiceState, setVoiceState] = useState<VoiceState>({
    microphoneState: 'idle',
    audioState: 'idle',
    turnState: 'idle',
    audioPlaying: false,
    voiceActivity: { isDetected: false, volume: 0, timestamp: Date.now() }
  });

  const [microphoneActive, setMicrophoneActive] = useState(false);
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [coachFeedbackVisible, setCoachFeedbackVisible] = useState(false);
  const [voiceActivityLevel, setVoiceActivityLevel] = useState(0);
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  const [currentInterimText, setCurrentInterimText] = useState('');

  const recognitionRef = useRef<StreamingSpeechRecognition | null>(null);
  const browserRecognitionRef = useRef<any>(null);
  const voiceActivityRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioPlayerRef = useRef<StreamingAudioPlayer | null>(null);
  const bargedInRef = useRef(false);

  const accumulatedTranscriptRef = useRef(accumulatedTranscript);
  const currentInterimTextRef = useRef(currentInterimText);
  const onSendMessageRef = useRef(onSendMessage);

  const getLastExchange = useCallback(() => {
    const { messages } = sessionData;
    const userMessages = messages.filter(m => m.role === 'user');
    const aiMessages = messages.filter(m => m.role === 'assistant' && m.agent !== 'coach');
    return {
      userMessage: typeof userMessages[userMessages.length - 1]?.content === 'string' ? userMessages[userMessages.length - 1].content as string : '',
      aiMessage: typeof aiMessages[aiMessages.length - 1]?.content === 'string' ? aiMessages[aiMessages.length - 1].content as string : ''
    };
  }, [sessionData.messages]);

  // Voice activity detection — reads mic analyser for wave visualizer
  const setupVoiceActivityDetection = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      let stream = recognitionRef.current?.getMediaStream();
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
      }
      micStreamRef.current = stream;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let animFrameId: number;

      const updateVoiceActivity = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
          const normalizedVolume = Math.min(1, average / 128);
          voiceActivityRef.current = normalizedVolume;
          setVoiceActivityLevel(normalizedVolume);
        }
        animFrameId = requestAnimationFrame(updateVoiceActivity);
      };
      updateVoiceActivity();

      return () => cancelAnimationFrame(animFrameId);
    } catch (error) {
      console.error('Error setting up voice activity detection:', error);
      toast({ title: 'Microphone Error', description: 'Could not access your microphone.', variant: 'destructive' });
    }
  }, [toast]);

  // ── Start voice session — called ONCE when interview begins ──
  const startVoiceSession = useCallback(async () => {
    if (recognitionRef.current) return; // already running

    try {
      setVoiceState(prev => ({ ...prev, microphoneState: 'listening', turnState: 'idle' }));

      // Init streaming audio player for Gemini Live audio chunks
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new StreamingAudioPlayer((isPlaying) => {
          recognitionRef.current?.setAiSpeaking(isPlaying);
          setVoiceState(prev => ({
            ...prev,
            audioPlaying: isPlaying,
            audioState: isPlaying ? 'playing' : 'idle',
            turnState: isPlaying ? 'ai' : 'user',
          }));
        });
      }
      await audioPlayerRef.current.unlock();

      // Start browser Web Speech API for local transcript display
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          if (browserRecognitionRef.current) { try { browserRecognitionRef.current.stop(); } catch (_) {} }
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
            } else if (interimTranscript.trim()) {
              setCurrentInterimText(interimTranscript.trim());
            }
          };
          recognizer.onerror = (event: any) => console.debug('Browser speech recognition notice:', event.error);
          recognizer.onend = () => {
            // Auto-restart if session is still active
            if (recognitionRef.current && !recognitionRef.current['isStopped']) {
              try { recognizer.start(); } catch (_) {}
            }
          };
          recognizer.start();
          browserRecognitionRef.current = recognizer;
        } catch (e) {
          console.debug('Browser speech recognition unavailable:', e);
        }
      }

      // Open persistent WebSocket to backend → Gemini Live
      recognitionRef.current = api.createStreamingSpeechRecognition({
        sessionId: sessionData.sessionId,

        onConnected: () => {
          console.log('🎙️ Voice session connected — Gemini Live active');
          setMicrophoneActive(true);
          setupVoiceActivityDetection();
          setVoiceState(prev => ({ ...prev, microphoneState: 'listening', turnState: 'idle' }));
        },

        onDisconnected: () => {
          console.log('🔌 Voice session disconnected');
          setMicrophoneActive(false);
          setVoiceState(prev => ({ ...prev, microphoneState: 'idle', turnState: 'idle' }));
        },

        onTranscript: (text, isFinal, role) => {
          if (!text || !text.trim()) return;
          // Only accumulate user transcripts for display — AI transcripts come as audio
          if (role === 'assistant') return;

          if (isFinal) {
            setAccumulatedTranscript(prev => {
              const newText = prev.trim() ? prev + ' ' + text : text;
              console.log('📝 Final user transcript:', text);
              return newText;
            });
            setCurrentInterimText('');
          } else {
            setCurrentInterimText(text);
          }
        },

        onAudioChunk: (base64Audio) => {
          // After barge-in, drop stale audio until Gemini acknowledges the interruption
          if (bargedInRef.current) return;

          recognitionRef.current?.setAiSpeaking(true);
          audioPlayerRef.current?.playChunk(base64Audio);
          setVoiceState(prev => ({
            ...prev,
            audioState: 'playing',
            turnState: 'ai',
            audioPlaying: true,
          }));
          setAccumulatedTranscript('');
          setCurrentInterimText('');
        },

        onBargeIn: () => {
          console.log('🛑 Barge-in: user interrupted AI');
          bargedInRef.current = true;
          recognitionRef.current?.setAiSpeaking(false);
          audioPlayerRef.current?.stop();
          setVoiceState(prev => ({
            ...prev,
            audioState: 'idle',
            turnState: 'user',
            audioPlaying: false,
          }));
        },

        onTurnEnded: (stopReason) => {
          console.log('🔄 AI turn ended:', stopReason, '→ mic open for user');
          bargedInRef.current = false;
          recognitionRef.current?.setAiSpeaking(false);
          setVoiceState(prev => ({
            ...prev,
            turnState: 'user',
            audioState: 'idle',
            audioPlaying: false,
            microphoneState: 'listening',
          }));
        },

        onInterviewEnding: () => {
          console.log('🏁 Backend signaled interview ending');
          setTimeout(() => { onEndInterview?.(); }, 2500);
        },

        onSpeechStarted: () => {
          setVoiceState(prev => ({
            ...prev,
            voiceActivity: { ...prev.voiceActivity, isDetected: true },
            turnState: 'user',
          }));
        },

        onUtteranceEnd: () => {
          setTimeout(() => {
            setVoiceState(prev => ({
              ...prev,
              voiceActivity: { ...prev.voiceActivity, isDetected: false },
            }));
          }, 1000);
        },

        onError: (error) => {
          console.error('Voice stream error:', error);
          toast({ title: 'Voice Service Notice', description: error || 'A voice issue occurred', variant: 'default' });
        },
      });

      await recognitionRef.current.start();

    } catch (error) {
      console.error('Failed to start voice session:', error);
      toast({ title: 'Microphone Error', description: 'Could not connect to voice service.', variant: 'destructive' });
    }
  }, [setupVoiceActivityDetection, toast, sessionData.sessionId, onEndInterview]);

  // ── Stop voice session — called ONCE when interview ends ──
  const stopVoiceSession = useCallback(() => {
    if (browserRecognitionRef.current) {
      try { browserRecognitionRef.current.stop(); } catch (_) {}
      browserRecognitionRef.current = null;
    }
    if (audioPlayerRef.current) { audioPlayerRef.current.stop(); }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setMicrophoneActive(false);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    setVoiceState({ microphoneState: 'idle', audioState: 'idle', turnState: 'idle', audioPlaying: false, voiceActivity: { isDetected: false, volume: 0, timestamp: Date.now() } });
    setAccumulatedTranscript('');
    setCurrentInterimText('');
  }, []);

  // toggleMicrophone is kept for the DevTextInput keyboard button only —
  // it does NOT destroy the session, just a no-op during voice interviews
  const toggleMicrophone = useCallback(async () => {
    if (!recognitionRef.current) {
      await startVoiceSession();
    }
  }, [startVoiceSession]);

  const toggleTranscript = useCallback(() => { setTranscriptVisible(prev => !prev); }, []);
  const toggleCoachFeedback = useCallback(() => { setCoachFeedbackVisible(prev => !prev); }, []);
  const closeCoachFeedback = useCallback(() => { setCoachFeedbackVisible(false); }, []);

  // No-op TTS handlers — Gemini Live handles all audio natively
  const handleTTSStart = useCallback(() => {}, []);
  const handleTTSEnd = useCallback(() => {}, []);
  const playTextToSpeech = useCallback(async (_text: string) => {}, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVoiceSession();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.close();
        audioPlayerRef.current = null;
      }
    };
  }, [stopVoiceSession]);

  // Interaction state — mic is always on during voice interview, no user toggle
  const getInteractionState = useCallback(() => {
    const sessionNotReady = sessionData.state !== 'interviewing';
    return {
      isListening: microphoneActive && !sessionNotReady,
      isProcessing: voiceState.turnState === 'ai',
      isDisabled: sessionNotReady
    };
  }, [voiceState, microphoneActive, sessionData.state]);

  const interactionState = getInteractionState();

  // Keep refs in sync
  useEffect(() => { accumulatedTranscriptRef.current = accumulatedTranscript; }, [accumulatedTranscript]);
  useEffect(() => { currentInterimTextRef.current = currentInterimText; }, [currentInterimText]);
  useEffect(() => { onSendMessageRef.current = onSendMessage; }, [onSendMessage]);

  return {
    messages: sessionData.messages,
    isLoading: sessionData.isLoading,
    state: sessionData.state,
    results: sessionData.results,
    selectedVoice: sessionData.selectedVoice,

    voiceState,
    microphoneActive,
    audioPlaying: voiceState.audioPlaying,
    transcriptVisible,
    coachFeedbackVisible,
    voiceActivityLevel,
    accumulatedTranscript,

    isListening: interactionState.isListening,
    isProcessing: interactionState.isProcessing,
    isDisabled: interactionState.isDisabled,

    toggleMicrophone,
    toggleTranscript,
    toggleCoachFeedback,
    closeCoachFeedback,
    handleTTSStart,
    handleTTSEnd,
    playTextToSpeech,

    lastExchange: getLastExchange(),
    turnState: voiceState.turnState,

    startVoiceSession,
    stopVoiceSession,
  };
}

export type { Message, CoachFeedbackState } from './useInterviewSession';
