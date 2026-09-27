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
  voiceActivity: { isDetected: boolean; volume: number; timestamp: number };
};

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

  const [turnState, setTurnState] = useState<'user' | 'ai' | 'idle'>('idle');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const [voiceActivityLevel, setVoiceActivityLevel] = useState(0);
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  const [streamingAiText, setStreamingAiText] = useState('');

  const recognitionRef = useRef<StreamingSpeechRecognition | null>(null);
  const audioPlayerRef = useRef<StreamingAudioPlayer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const setupVoiceActivityDetection = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

      const stream = recognitionRef.current?.getMediaStream();
      if (!stream) return;
      micStreamRef.current = stream;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let animId: number;
      const update = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((s, v) => s + v, 0) / bufferLength;
          setVoiceActivityLevel(Math.min(1, avg / 128));
        }
        animId = requestAnimationFrame(update);
      };
      update();
      return () => cancelAnimationFrame(animId);
    } catch (e) {
      console.error('VAD setup error:', e);
    }
  }, []);

  const startVoiceSession = useCallback(async () => {
    if (recognitionRef.current) return;

    try {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new StreamingAudioPlayer((isPlaying) => {
          setAudioPlaying(isPlaying);
          if (!isPlaying) setTurnState('idle');
        });
      }
      await audioPlayerRef.current.unlock();

      recognitionRef.current = api.createStreamingSpeechRecognition({
        sessionId: sessionData.sessionId,

        onConnected: () => {
          setMicrophoneActive(true);
          setTurnState('idle');
          setupVoiceActivityDetection();
          console.log('🎙️ Voice session connected');
        },

        onDisconnected: () => {
          setMicrophoneActive(false);
          setTurnState('idle');
        },

        onTranscript: (text, isFinal, role) => {
          if (!text?.trim()) return;
          if (role === 'assistant') {
            // Stream AI text word by word as Gemini speaks
            if (!isFinal) {
              setStreamingAiText(prev => prev + text);
            } else {
              // Final output transcription — keep it visible briefly then clear
              setStreamingAiText('');
            }
          } else {
            // User transcript from Gemini's STT
            if (isFinal) {
              console.log('📝 User voice captured:', text);
              setAccumulatedTranscript(prev => prev ? prev + ' ' + text : text);
            }
          }
        },

        onAudioChunk: (base64Audio) => {
          audioPlayerRef.current?.playChunk(base64Audio);
          setTurnState('ai');
          setAudioPlaying(true);
          setAccumulatedTranscript('');
        },

        onTurnEnded: () => {
          console.log('🔄 AI turn ended → user can speak');
          setTurnState('user');
          setAudioPlaying(false);
          setStreamingAiText('');
        },

        onInterviewEnding: () => {
          setTimeout(() => { onEndInterview?.(); }, 2500);
        },

        onError: (error) => {
          console.error('Voice error:', error);
          toast({ title: 'Voice Notice', description: error, variant: 'default' });
        },

        onBargeIn: undefined,
        onSpeechStarted: undefined,
        onUtteranceEnd: undefined,
      });

      await recognitionRef.current.start();
    } catch (e) {
      console.error('Failed to start voice session:', e);
      toast({ title: 'Microphone Error', description: 'Could not connect to voice service.', variant: 'destructive' });
    }
  }, [setupVoiceActivityDetection, toast, sessionData.sessionId, onEndInterview]);

  const stopVoiceSession = useCallback(() => {
    if (audioPlayerRef.current) audioPlayerRef.current.stop();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    setMicrophoneActive(false);
    setTurnState('idle');
    setAudioPlaying(false);
    setStreamingAiText('');
    setAccumulatedTranscript('');
  }, []);

  useEffect(() => {
    return () => {
      stopVoiceSession();
      audioPlayerRef.current?.close();
      audioPlayerRef.current = null;
    };
  }, [stopVoiceSession]);

  const isListening = microphoneActive && turnState !== 'ai';
  const isProcessing = false;
  const isDisabled = sessionData.state !== 'interviewing';

  // No-op stubs for backward compatibility
  const toggleMicrophone = useCallback(async () => {
    if (!recognitionRef.current) await startVoiceSession();
  }, [startVoiceSession]);

  return {
    messages: sessionData.messages,
    isLoading: sessionData.isLoading,
    state: sessionData.state,
    results: sessionData.results,
    selectedVoice: sessionData.selectedVoice,

    voiceState: { microphoneState: 'listening' as const, audioState: 'idle' as const, turnState, audioPlaying, voiceActivity: { isDetected: false, volume: 0, timestamp: 0 } },
    microphoneActive,
    audioPlaying,
    voiceActivityLevel,
    accumulatedTranscript,
    streamingAiText,

    isListening,
    isProcessing,
    isDisabled,
    turnState,

    toggleMicrophone,
    startVoiceSession,
    stopVoiceSession,
    toggleTranscript: () => {},
    toggleCoachFeedback: () => {},
    closeCoachFeedback: () => {},
    handleTTSStart: () => {},
    handleTTSEnd: () => {},
    playTextToSpeech: async (_: string) => {},
    lastExchange: { userMessage: '', aiMessage: '' },
  };
}

export type { Message, CoachFeedbackState } from './useInterviewSession';
