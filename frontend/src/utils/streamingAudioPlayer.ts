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
  private endDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly END_DEBOUNCE_MS = 300;
  private chunkCount = 0;

  constructor(onPlaybackStateChange?: (isPlaying: boolean) => void) {
    this.onPlaybackStateChange = onPlaybackStateChange;
  }

  public async unlock(): Promise<void> {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
        this.nextPlayTime = this.audioContext.currentTime;
        console.log('[AudioPlayer] Created AudioContext, state:', this.audioContext.state);
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('[AudioPlayer] AudioContext resumed, state:', this.audioContext.state);
      }
      console.log('[AudioPlayer] unlock() done, state:', this.audioContext.state, 'currentTime:', this.audioContext.currentTime);
    } catch (e) {
      console.error('[AudioPlayer] unlock failed:', e);
    }
  }

  async playChunk(base64Data: string) {
    this.chunkCount++;
    const chunkNum = this.chunkCount;

    // Cancel pending end notification — more chunks arriving
    if (this.endDebounceTimer !== null) {
      clearTimeout(this.endDebounceTimer);
      this.endDebounceTimer = null;
    }

    try {
      // Ensure AudioContext exists and is running
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
        this.nextPlayTime = this.audioContext.currentTime;
        console.log('[AudioPlayer] Re-created AudioContext in playChunk');
      }

      if (this.audioContext.state === 'suspended') {
        console.log('[AudioPlayer] AudioContext suspended on chunk', chunkNum, '— resuming...');
        await this.audioContext.resume();
        console.log('[AudioPlayer] Resumed, new state:', this.audioContext.state);
      }

      if (this.audioContext.state !== 'running') {
        console.error('[AudioPlayer] AudioContext not running (state:', this.audioContext.state, ') — dropping chunk', chunkNum);
        return;
      }

      if (chunkNum <= 3) {
        console.log('[AudioPlayer] Playing chunk', chunkNum, '| base64 length:', base64Data.length,
          '| ctx state:', this.audioContext.state, '| currentTime:', this.audioContext.currentTime.toFixed(3),
          '| nextPlayTime:', this.nextPlayTime.toFixed(3));
      }

      // Decode base64 → raw bytes → Int16 PCM → Float32
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);

      if (pcm16.length === 0) {
        console.warn('[AudioPlayer] Empty PCM chunk', chunkNum, '— skipping');
        return;
      }

      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      // Gemini Live outputs 24kHz mono 16-bit PCM
      const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      const now = this.audioContext.currentTime;
      const startTime = Math.max(now, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;

      if (chunkNum <= 3) {
        console.log('[AudioPlayer] Scheduled chunk', chunkNum, 'at', startTime.toFixed(3),
          'duration:', audioBuffer.duration.toFixed(3), 's | PCM samples:', pcm16.length);
      }

      this.activeSources.push(source);

      if (!this.isPlaying) {
        this.isPlaying = true;
        this.onPlaybackStateChange?.(true);
      }

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) this.activeSources.splice(idx, 1);

        if (this.activeSources.length === 0) {
          this.endDebounceTimer = setTimeout(() => {
            if (this.activeSources.length === 0) {
              this.isPlaying = false;
              this.chunkCount = 0;
              console.log('[AudioPlayer] Playback complete');
              this.onPlaybackStateChange?.(false);
            }
            this.endDebounceTimer = null;
          }, this.END_DEBOUNCE_MS);
        }
      };
    } catch (e) {
      console.error('[AudioPlayer] Error playing chunk', chunkNum, ':', e);
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
      this.chunkCount = 0;
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
