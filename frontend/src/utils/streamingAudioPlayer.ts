/**
 * Web Audio API PCM streaming player for Gemini Live / Nova Sonic.
 * Plays 24kHz 16-bit linear PCM chunks seamlessly with barge-in support.
 */

export class StreamingAudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  private activeSources: AudioBufferSourceNode[] = [];
  private onPlaybackStateChange?: (isPlaying: boolean) => void;
  // Debounce timer so brief gaps between chunks don't fire "stopped" prematurely
  private endDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly END_DEBOUNCE_MS = 300;

  constructor(onPlaybackStateChange?: (isPlaying: boolean) => void) {
    this.onPlaybackStateChange = onPlaybackStateChange;
  }

  public async unlock(): Promise<void> {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
        this.nextPlayTime = this.audioContext.currentTime;
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('🔊 AudioContext resumed (state:', this.audioContext.state, ')');
      }
    } catch (e) {
      console.warn('Could not resume AudioContext:', e);
    }
  }

  private async ensureRunning(): Promise<boolean> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
        this.nextPlayTime = this.audioContext.currentTime;
      } catch (e) {
        console.error('Failed to create AudioContext:', e);
        return false;
      }
    }
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (e) {
        console.warn('AudioContext resume failed:', e);
        return false;
      }
    }
    return this.audioContext.state === 'running';
  }

  async playChunk(base64Data: string) {
    // Cancel any pending "playback ended" notification — more chunks are arriving
    if (this.endDebounceTimer !== null) {
      clearTimeout(this.endDebounceTimer);
      this.endDebounceTimer = null;
    }

    try {
      const ready = await this.ensureRunning();
      if (!ready || !this.audioContext) return;

      // Decode base64 → Int16 PCM → Float32
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      // Gemini Live outputs 24kHz mono PCM
      const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      const now = this.audioContext.currentTime;
      const startTime = Math.max(now, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;

      this.activeSources.push(source);

      if (!this.isPlaying) {
        this.isPlaying = true;
        this.onPlaybackStateChange?.(true);
      }

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) this.activeSources.splice(idx, 1);

        // Only signal "stopped" after debounce — avoids false stops between chunks
        if (this.activeSources.length === 0) {
          this.endDebounceTimer = setTimeout(() => {
            if (this.activeSources.length === 0) {
              this.isPlaying = false;
              this.onPlaybackStateChange?.(false);
            }
            this.endDebounceTimer = null;
          }, this.END_DEBOUNCE_MS);
        }
      };
    } catch (e) {
      console.error('Error playing audio chunk:', e);
    }
  }

  stop() {
    if (this.endDebounceTimer !== null) {
      clearTimeout(this.endDebounceTimer);
      this.endDebounceTimer = null;
    }
    for (const source of this.activeSources) {
      try { source.stop(); source.disconnect(); } catch (_) {}
    }
    this.activeSources = [];
    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
    if (this.isPlaying) {
      this.isPlaying = false;
      this.onPlaybackStateChange?.(false);
    }
  }

  close() {
    this.stop();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}
