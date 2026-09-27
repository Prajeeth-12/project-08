// API service for all backend interactions
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');
// WebSocket URL for streaming APIs
const WS_BASE_URL = import.meta.env.VITE_API_WS_URL || 'ws://localhost:8000';

// Authentication interfaces
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    created_at?: string;
  };
}

export interface SessionResponse {
  session_id: string;
  message: string;
}

export interface InterviewStartRequest {
  job_role: string;
  job_description?: string;
  resume_content?: string;
  style?: 'formal' | 'casual' | 'aggressive' | 'technical';
  difficulty?: 'easy' | 'medium' | 'hard';
  company_name?: string;
  interview_duration_minutes?: number;
  use_time_based_interview?: boolean;
}

// Speech recognition types
export interface SpeechTranscriptionEvent {
  type: 'transcript' | 'error' | 'connected' | 'speech_started' | 'utterance_end' | 'audio' | 'barge_in' | 'turn_ended' | 'renewed' | 'interview_ending';
  text?: string;
  is_final?: boolean;
  error?: string;
  message?: string;
  timestamp?: string | number;
  event_time?: string;
  last_spoken_at?: number;
  data?: string; // base64 audio chunk from Amazon Nova 2 Sonic / Gemini Live
  role?: 'user' | 'assistant';
  stop_reason?: string;
  engine?: string;
  state?: any;
}

export interface StreamingSpeechOptions {
  sessionId?: string;  // Session ID for linking speech tasks
  onTranscript: (transcript: string, isFinal: boolean, role?: 'user' | 'assistant') => void;
  onError: (error: string) => void;
  onConnected: () => void;
  onDisconnected: () => void;
  onSpeechStarted?: (timestamp: number) => void;
  onUtteranceEnd?: (lastSpokenAt: number) => void;
  onAudioChunk?: (base64Audio: string) => void;
  onBargeIn?: () => void;
  onTurnEnded?: (stopReason: string) => void;
  onInterviewEnding?: (state?: any) => void;
  onUserSpeaking?: (isSpeaking: boolean) => void;
}

export class StreamingSpeechRecognition {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private options: StreamingSpeechOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private isMuted: boolean = false;

  constructor(options: StreamingSpeechOptions) {
    this.options = options;
  }

  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  // No-op kept for compatibility
  setAiSpeaking(_speaking: boolean): void {
    // barge-in removed — turn-based only
    if (false) {
      this.lastAiSpeechEndTime = Date.now();
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  sendTranscript(text: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && text.trim()) {
      this.ws.send(JSON.stringify({ type: 'transcript', text }));
    }
  }

  async start(): Promise<void> {
    try {
      // Get microphone access with acoustic echo cancellation
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Connect WebSocket to backend Nova Sonic stream
      await this.connectWebSocket();
      
      // Start recording and streaming audio
      await this.startRecording();
      
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  stop(): void {
    // Stop Web Audio processing
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.inputSource) {
      this.inputSource.disconnect();
      this.inputSource = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Stop MediaRecorder fallback if active
    if (this.mediaRecorder) {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
      this.mediaRecorder = null;
    }
    
    // Stop microphone stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    // Close WebSocket
    this.closeWebSocket();
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      let wsUrl = `${WS_BASE_URL}/api/speech-to-text/stream`;
      if (this.options.sessionId) {
        wsUrl += `?session_id=${encodeURIComponent(this.options.sessionId)}`;
      }
      
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';
      
      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      };
      
      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.options.onDisconnected();
        console.log('Nova Sonic WebSocket closed:', event);
      };
      
      this.ws.onerror = (event) => {
        console.error('Nova Sonic WebSocket error:', event);
        reject(new Error('WebSocket connection failed'));
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SpeechTranscriptionEvent;
          
          switch (data.type) {
            case 'transcript':
              if (data.text !== undefined) {
                this.options.onTranscript(data.text, data.is_final || false, data.role);
              }
              break;
            case 'audio':
              if (data.data && this.options.onAudioChunk) {
                this.options.onAudioChunk(data.data);
              }
              break;
            case 'barge_in':
              if (this.options.onBargeIn) {
                this.options.onBargeIn();
              }
              break;
            case 'turn_ended':
              if (this.options.onTurnEnded) {
                this.options.onTurnEnded(data.stop_reason || 'END_TURN');
              }
              break;
            case 'speech_started':
              if (data.timestamp !== undefined && this.options.onSpeechStarted) {
                this.options.onSpeechStarted(Number(data.timestamp));
              }
              break;
            case 'utterance_end':
              if (data.last_spoken_at !== undefined && this.options.onUtteranceEnd) {
                this.options.onUtteranceEnd(Number(data.last_spoken_at));
              }
              break;
            case 'error':
              if (data.error) {
                this.options.onError(data.error);
              }
              break;
            case 'connected':
              this.options.onConnected();
              break;
            case 'interview_ending':
              if (this.options.onInterviewEnding) {
                this.options.onInterviewEnding(data.state);
              }
              break;
          }
        } catch (error) {
          console.error('Error processing Nova Sonic message:', error);
        }
      };
    });
  }

  private closeWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  private consecutiveLoudFrames: number = 0;
  private readonly BARGE_IN_RMS_THRESHOLD: number = 0.06;
  private readonly BARGE_IN_CONSECUTIVE_FRAMES: number = 3;
  private aiSpeakingStartTime: number = 0;
  // VAD for end-of-speech detection (bypasses Gemini's unreliable VAD)
  private vadSpeechFrames: number = 0;
  private vadSilenceFrames: number = 0;
  private readonly VAD_SPEECH_THRESHOLD: number = 0.04; // after 4x gain
  private readonly VAD_MIN_SPEECH_FRAMES: number = 8;   // ~0.7s min speech
  private readonly VAD_SILENCE_FRAMES: number = 18;     // ~1.5s silence = end of turn
  private vadTriggeredAt: number = 0;

  // 4× gain: mic RMS of 0.008–0.030 becomes 0.032–0.120, enough for Gemini's VAD
  private readonly MIC_GAIN = 4.0;

  private resampleTo16kHz(input: Float32Array, sampleRate: number): Int16Array {
    if (sampleRate === 16000) {
      const pcm16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i] * this.MIC_GAIN));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      return pcm16;
    }

    const ratio = sampleRate / 16000;
    const outLength = Math.floor(input.length / ratio);
    const pcm16 = new Int16Array(outLength);

    for (let i = 0; i < outLength; i++) {
      const origPos = i * ratio;
      const index = Math.floor(origPos);
      const frac = origPos - index;
      const s1 = input[index] || 0;
      const s2 = index + 1 < input.length ? input[index + 1] : s1;
      const interpolated = (s1 + frac * (s2 - s1)) * this.MIC_GAIN;
      const clamped = Math.max(-1, Math.min(1, interpolated));
      pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
    }
    return pcm16;
  }

  private async startRecording(): Promise<void> {
    if (!this.mediaStream || !this.isConnected) return;
    
    try {
      // Use Web Audio API to capture microphone audio
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      this.inputSource = this.audioContext.createMediaStreamSource(this.mediaStream);
      // 2048 or 4096 samples buffer
      const bufferSize = this.audioContext.sampleRate > 32000 ? 4096 : 2048;
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      const currentSampleRate = this.audioContext.sampleRate;
      console.log(`🎙️ Recording started at native sample rate: ${currentSampleRate}Hz (resampling to 16kHz PCM)`);

      let pcmFrameCounter = 0;
      this.processor.onaudioprocess = (e) => {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        if (this.isMuted) return;

        const input = e.inputBuffer.getChannelData(0);

        // RMS for VAD
        let sumSquares = 0;
        for (let i = 0; i < input.length; i++) sumSquares += input[i] * input[i];
        const rms = Math.sqrt(sumSquares / input.length);

        // Always send audio to Gemini (no barge-in gating — turn-based)
        const pcm16 = this.resampleTo16kHz(input, currentSampleRate);
        this.ws.send(pcm16.buffer);
        pcmFrameCounter++;
        if (pcmFrameCounter % 60 === 0) {
          console.log(`🎤 Audio to AI (RMS: ${rms.toFixed(3)})`);
        }

        // Client VAD: detect speech/silence and signal Gemini when user finishes
        const boostedRms = rms * this.MIC_GAIN;
        const wasSpeaking = this.vadSpeechFrames > 0 && this.vadSilenceFrames === 0;
        if (boostedRms >= this.VAD_SPEECH_THRESHOLD) {
          this.vadSpeechFrames++;
          this.vadSilenceFrames = 0;
          if (!wasSpeaking && this.vadSpeechFrames === 1) {
            this.options.onUserSpeaking?.(true);
          }
        } else if (this.vadSpeechFrames >= this.VAD_MIN_SPEECH_FRAMES) {
          this.vadSilenceFrames++;
          if (this.vadSilenceFrames === 1) {
            this.options.onUserSpeaking?.(false);
          }
          if (this.vadSilenceFrames >= this.VAD_SILENCE_FRAMES) {
            const now = Date.now();
            if (now - this.vadTriggeredAt > 3000) {
              this.vadTriggeredAt = now;
              console.log(`🗣️ VAD: end-of-speech (${this.vadSpeechFrames} frames) → signalling Gemini`);
              this.ws.send(JSON.stringify({ type: 'end_of_speech' }));
            }
            this.vadSpeechFrames = 0;
            this.vadSilenceFrames = 0;
          }
        } else {
          if (this.vadSpeechFrames > 0) this.options.onUserSpeaking?.(false);
          this.vadSpeechFrames = 0;
          this.vadSilenceFrames = 0;
        }
      };
      
      // Connect through a zero-gain node to destination so onaudioprocess runs
      // WITHOUT routing microphone audio back through the device speakers
      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0;
      this.inputSource.connect(this.processor);
      this.processor.connect(silentGain);
      silentGain.connect(this.audioContext.destination);
    } catch (err) {
      console.warn('Web Audio PCM capture unavailable, using MediaRecorder fallback:', err);
      try {
        this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType: 'audio/webm' });
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            const reader = new FileReader();
            reader.onload = () => {
              if (this.ws && this.isConnected && reader.result) {
                this.ws.send(reader.result);
              }
            };
            reader.readAsArrayBuffer(event.data);
          }
        };
        this.mediaRecorder.start(100);
      } catch (recError) {
        console.error('Error starting MediaRecorder fallback:', recError);
        this.options.onError(`Failed to start audio recording: ${recError}`);
      }
    }
  }
}

export interface UserInput {
  message: string;
}

// This interface should match the structure returned by the /interview/message endpoint,
// which is based on the dictionary constructed in AgentSessionManager.process_message
export interface AgentResponse {
  role: 'user' | 'assistant' | 'system'; // Role can be user, assistant, or system
  agent?: 'interviewer' | 'coach';      // Optional: specifies the agent type for assistant messages
  content: any;                         // Can be string (interviewer) or object (coach feedback)
  response_type?: string;               // e.g., 'question', 'coaching_feedback', 'introduction', 'closing'
  metadata?: Record<string, any>;       // Any additional metadata
  timestamp?: string;                   // ISO string timestamp
  processing_time?: number;             // Optional processing time
  is_error?: boolean;                   // If it's a system error message
}

export interface PerTurnFeedbackItem {
  question: string;
  answer: string;
  feedback: string;
}

export interface EndResponse {
  results: any;  // This contains the coaching summary directly
  per_turn_feedback?: PerTurnFeedbackItem[];
}

export interface FinalSummaryStatusResponse {
  status: 'generating' | 'completed' | 'error';
  results?: any;
  error?: string;
}

export interface ResumeUploadServerResponse {
  filename: string;
  resume_text: string;
  message: string;
}

export interface HistoryResponse {
  history: any[];
}

export interface StatsResponse {
  stats: any;
}

export interface ResetResponse {
  message: string;
}

export interface SessionTimeRemainingResponse {
  time_remaining_minutes: number;
  session_active: boolean;
}

export interface SessionPingResponse {
  success: boolean;
  message: string;
  new_expiry_minutes: number;
}

export interface SessionCleanupResponse {
  success: boolean;
  message: string;
}

// Helper for handling response errors
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || 'An error occurred';
    
    // Check for session timeout/not found errors
    if (response.status === 404 && errorMessage.toLowerCase().includes('session')) {
      // Session not found - likely timed out
      throw new Error('SESSION_TIMEOUT: Your session has expired due to inactivity. Please start a new interview from the home page.');
    }
    
    throw new Error(errorMessage);
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return response;
};

// Authentication-related API calls
export async function registerUser(data: RegisterRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function loginUser(data: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function logoutUser(): Promise<{ message: string }> {
  const token = localStorage.getItem('ai_interviewer_access_token');
  
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

export async function getUserProfile(): Promise<any> {
  const token = localStorage.getItem('ai_interviewer_access_token');
  
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

// Utility function to add auth headers to API requests
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('ai_interviewer_access_token');
  
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

// Modified existing API functions to include authentication

export async function createSession(data: InterviewStartRequest): Promise<SessionResponse> {
  const response = await fetch(`${API_BASE_URL}/interview/session`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function startInterview(sessionId: string, data: InterviewStartRequest): Promise<AgentResponse> {
  const response = await fetch(`${API_BASE_URL}/interview/start`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function sendMessage(sessionId: string, data: UserInput): Promise<AgentResponse> {
  const response = await fetch(`${API_BASE_URL}/interview/message`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify(data),
  });

  return handleResponse(response);
}

export async function endInterview(sessionId: string): Promise<EndResponse> {
  const response = await fetch(`${API_BASE_URL}/interview/end`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'X-Session-ID': sessionId,
    },
  });

  return handleResponse(response);
}

export async function getConversationHistory(sessionId: string): Promise<HistoryResponse> {
  const response = await fetch(`${API_BASE_URL}/interview/history`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      'X-Session-ID': sessionId,
    },
  });

  return handleResponse(response);
}

export async function getSessionStats(sessionId: string): Promise<StatsResponse> {
  const response = await fetch(`${API_BASE_URL}/interview/stats`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      'X-Session-ID': sessionId,
    },
  });

  return handleResponse(response);
}

export async function getPerTurnFeedback(sessionId: string): Promise<PerTurnFeedbackItem[]> {
  const response = await fetch(`${API_BASE_URL}/interview/per-turn-feedback`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      'X-Session-ID': sessionId,
    },
  });

  return handleResponse(response);
}

export async function getFinalSummaryStatus(sessionId: string): Promise<FinalSummaryStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/interview/final-summary-status`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      'X-Session-ID': sessionId,
    },
  });

  return handleResponse(response);
}

export async function resetInterview(sessionId: string): Promise<ResetResponse> {
  const response = await fetch(`${API_BASE_URL}/interview/reset`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'X-Session-ID': sessionId,
    },
  });

  return handleResponse(response);
}

export async function getSessionTimeRemaining(sessionId: string): Promise<SessionTimeRemainingResponse> {
  const response = await fetch(`${API_BASE_URL}/interview/session/time-remaining`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      'X-Session-ID': sessionId,
    },
  });

  return handleResponse(response);
}

export async function pingSession(sessionId: string): Promise<SessionPingResponse> {
  const response = await fetch(`${API_BASE_URL}/interview/session/ping`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'X-Session-ID': sessionId,
    },
  });

  return handleResponse(response);
}

export async function cleanupSession(sessionId: string): Promise<SessionCleanupResponse> {
  const response = await fetch(`${API_BASE_URL}/interview/session/cleanup`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'X-Session-ID': sessionId,
    },
  });

  return handleResponse(response);
}

// API methods
export const api = {
  // Health check
  checkHealth: async () => {
    const response = await fetch(`${API_BASE_URL}/`);
    return handleResponse(response);
  },
  
  // File Processing API
  uploadResumeFile: async (file: File): Promise<ResumeUploadServerResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/files/upload-resume`, {
      method: 'POST',
      body: formData,
      // Note: Do not set Content-Type header when using FormData with fetch,
      // the browser will set it correctly including the boundary.
    });
    return handleResponse(response);
  },
  
  // Speech to Text API (batch processing with AssemblyAI)
  speechToText: async (audioBlob: Blob, language?: string): Promise<{ task_id: string, status: string }> => {
    const formData = new FormData();
    formData.append('audio_file', audioBlob);
    if (language) {
      formData.append('language', language);
    }
    
    const response = await fetch(`${API_BASE_URL}/api/speech-to-text`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  },
  
  checkSpeechToTextStatus: async (taskId: string): Promise<{ status: string, transcript?: string, error?: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/speech-to-text/status/${taskId}`);
    return handleResponse(response);
  },
  
  // Create streaming speech recognition instance
  createStreamingSpeechRecognition: (options: StreamingSpeechOptions): StreamingSpeechRecognition => {
    return new StreamingSpeechRecognition(options);
  },
  
  // Text to Speech API
  textToSpeech: async (text: string, speed?: number): Promise<Blob> => {
    const formData = new URLSearchParams();
    formData.append('text', text);
    // Note: voice_id is intentionally not sent - backend will use environment variables
    if (speed !== undefined) {
      formData.append('speed', speed.toString());
    }
    
    const response = await fetch(`${API_BASE_URL}/api/text-to-speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'An error occurred with TTS');
    }
    
    return response.blob();
  },
};
