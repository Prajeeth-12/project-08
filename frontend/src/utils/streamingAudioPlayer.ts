/**
 * High-performance Web Audio API PCM streaming player for Amazon Nova 2 Sonic.
 * Plays 24kHz 16-bit linear PCM audio chunks seamlessly with instant barge-in cutoff.
 * 
 * Authored strictly from our team's engineering perspective for Project 08.
 */

export class StreamingAudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  private activeSources: AudioBufferSourceNode[] = [];
  private onPlaybackStateChange?: (isPlaying: boolean) => void;

  constructor(onPlaybackStateChange?: (isPlaying: boolean) => void) {
    this.onPlaybackStateChange = onPlaybackStateChange;
    // Pre-bind unlock listeners for seamless browser autoplay compliance
    this.setupUnlockListeners();
  }

  private setupUnlockListeners() {
    const unlock = () => {
      this.unlock();
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
  }

  public async unlock(): Promise<void> {
    try {
      this.initContext();
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('🔊 StreamingAudioPlayer AudioContext resumed successfully (State:', this.audioContext.state, ')');
      }
    } catch (e) {
      console.warn('Could not resume AudioContext on user interaction:', e);
    }
  }

  private initContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      // Do NOT force sampleRate to 24000 on AudioContext constructor — let it use hardware rate
      // createBuffer(1, length, 24000) handles the 24kHz resample to hardware cleanly
      this.audioContext = new AudioCtx();
      this.nextPlayTime = this.audioContext.currentTime;
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  async playChunk(base64Data: string) {
    try {
      this.initContext();
      if (!this.audioContext) return;

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(() => {});
      }

      // Decode base64 to 16-bit PCM
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);

      // Convert Int16 [-32768, 32767] to Float32 [-1.0, 1.0]
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      // Gemini Live and Nova 2 Sonic both output 24kHz PCM mono audio
      const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      const currentTime = this.audioContext.currentTime;
      const startTime = Math.max(currentTime, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;

      this.activeSources.push(source);
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.onPlaybackStateChange?.(true);
      }

      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index !== -1) {
          this.activeSources.splice(index, 1);
        }
        if (this.activeSources.length === 0) {
          this.isPlaying = false;
          this.onPlaybackStateChange?.(false);
        }
      };
    } catch (e) {
      console.error('Error playing streaming PCM audio chunk:', e);
    }
  }

  stop() {
    // Interruption / barge-in: stop all scheduled sources immediately
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Source may already have ended
      }
    }
    this.activeSources = [];
    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
    this.isPlaying = false;
    this.onPlaybackStateChange?.(false);
  }

  close() {
    this.stop();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
