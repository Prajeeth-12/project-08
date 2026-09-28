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
  const setTurn = (s: 'user' | 'ai' | 'idle') => { turnStateRef.current = s; setTurnState(s); };
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const [voiceActivityLevel, setVoiceActivityLevel] = useState(0);
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);

  const aiTextRef = useRef<HTMLSpanElement | null>(null);
  const accumulatedAiTextRef = useRef('');
  const recognitionRef = useRef<StreamingSpeechRecognition | null>(null);
  const audioPlayerRef = useRef<StreamingAudioPlayer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const vadCleanupRef = useRef<(() => void) | null>(null);
  const turnStateRef = useRef<'user' | 'ai' | 'idle'>('idle');
  const clearAiText = () => {
    accumulatedAiTextRef.current = '';
    if (aiTextRef.current) aiTextRef.current.textContent = '';
  };

  const setupVoiceActivityDetection = useCallback(async () => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
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
        if (turnStateRef.current === 'ai' && audioPlayerRef.current) {
          // Drive the wave from actual AI playback audio
          setVoiceActivityLevel(audioPlayerRef.current.getLevel());
        } else if (analyserRef.current) {
          // Drive the wave from mic audio
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((s, v) => s + v, 0) / bufferLength;
          setVoiceActivityLevel(Math.min(1, avg / 128));
        }
        animId = requestAnimationFrame(update);
      };
      update();
      // Return cleanup so the caller can cancel the rAF loop
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
          if (!isPlaying) setTurn('idle');
        });
      }
      await audioPlayerRef.current.unlock();

      recognitionRef.current = api.createStreamingSpeechRecognition({
        sessionId: sessionData.sessionId,

        onConnected: () => {
          setMicrophoneActive(true);
          setTurn('idle');
          // Store VAD cleanup ref to cancel the rAF loop on stop
          setupVoiceActivityDetection().then(cleanup => {
            vadCleanupRef.current = cleanup || null;
          });
          console.log('🎙️ Voice session connected');
        },

        onDisconnected: () => {
          setMicrophoneActive(false);
          setTurn('idle');
          // Null the ref so startVoiceSession can be called again after reconnect
          recognitionRef.current = null;
        },

        onTranscript: (text, isFinal, role) => {
          if (role === 'assistant') {
            // Write tokens directly to DOM as they arrive — no queue, no interval
            if (!isFinal && text && turnStateRef.current === 'ai') {
              accumulatedAiTextRef.current += text;
              if (aiTextRef.current) aiTextRef.current.textContent = accumulatedAiTextRef.current;
            }
          } else {
            // Both interim and final user transcripts — replace so it streams live
            if (text) setAccumulatedTranscript(text);
            if (isFinal) console.log('📝 User voice captured:', text);
          }
        },

        onAudioChunk: (base64Audio) => {
          const player = audioPlayerRef.current;
          if (player?.audioContext?.state === 'suspended') player.audioContext.resume();
          player?.playChunk(base64Audio);
          setTurn('ai');
          setAudioPlaying(true);
        },

        onTurnEnded: () => {
          console.log('🔄 AI turn ended → user can speak');
          clearAiText();
          setTurn('user');
          setAudioPlaying(false);
          setAccumulatedTranscript('');
          recognitionRef.current?.setMuted(false);
        },

        onInterviewEnding: () => {
          setTimeout(() => { onEndInterview?.(); }, 2500);
        },

        onError: (error) => {
          console.error('Voice error:', error);
          toast({ title: 'Voice Notice', description: error, variant: 'default' });
        },

        onUserSpeaking: (speaking) => setIsUserSpeaking(speaking),
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
    // Cancel the VAD rAF loop
    vadCleanupRef.current?.();
    vadCleanupRef.current = null;

    if (audioPlayerRef.current) audioPlayerRef.current.stop();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    // Tear down the VAD AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    clearAiText();
    setMicrophoneActive(false);
    setTurn('idle');
    setAudioPlaying(false);
    setAccumulatedTranscript('');
    setIsUserSpeaking(false);
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

  // No-op stub for backward compatibility
  const toggleMicrophone = useCallback(async () => {
    if (!recognitionRef.current) await startVoiceSession();
  }, [startVoiceSession]);

  const finishAnswer = useCallback(() => {
    if (!recognitionRef.current) return;
    audioPlayerRef.current?.unlock();
    recognitionRef.current.setMuted(true);
    recognitionRef.current.sendEndOfTurn();
    setTurn('ai');
  }, []);

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
    aiTextRef,
    streamingAiText: '',
    isUserSpeaking,

    isListening,
    isProcessing,
    isDisabled,
    turnState,

    toggleMicrophone,
    startVoiceSession,
    stopVoiceSession,
    finishAnswer,
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
