/**
 * Motor de Lip Sync - Analisa audio em tempo real e sincroniza com ParamMouthOpenY.
 *
 * Usa Web Audio API (AnalyserNode) para extrair o volume (RMS) do audio
 * e normaliza para o range 0.0-1.0 do parametro de boca do Live2D.
 *
 * Fluxo:
 *   ArrayBuffer (TTS audio) -> AudioContext -> AnalyserNode -> RMS -> callback(value)
 *
 * O callback e chamado ~60x/seg via requestAnimationFrame e deve setar
 * model.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", value)
 */

export type LipSyncCallback = (value: number) => void;

export class LipSyncEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private animationFrameId: number | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private callback: LipSyncCallback;
  private smoothedValue = 0;
  private readonly smoothingFactor = 0.35; // suavizacao para evitar "tremedeira"

  constructor(callback: LipSyncCallback) {
    this.callback = callback;
  }

  /**
   * Inicia lip sync a partir de um ArrayBuffer de audio (retorno do TTS).
   * Decodifica o audio, conecta ao AnalyserNode e inicia o loop de analise.
   */
  async start(audioBuffer: ArrayBuffer): Promise<void> {
    this.stop(); // limpa qualquer sessao anterior

    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.5;

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    try {
      const decoded = await this.audioContext.decodeAudioData(audioBuffer.slice(0));
      this.source = this.audioContext.createBufferSource();
      this.source.buffer = decoded;
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.source.onended = () => this.stop();
      this.source.start(0);

      this.loop();
    } catch (err) {
      console.error('[LipSync] Erro ao decodificar audio:', err);
      this.stop();
    }
  }

  /**
   * Inicia lip sync a partir de um base64 string (formato retornado pelo /tts).
   */
  async startFromBase64(base64Audio: string): Promise<void> {
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    await this.start(bytes.buffer);
  }

  /**
   * Loop de analise de volume. Extrai RMS dos dados de frequencia
   * e converte para o range 0.0-1.0 com suavizacao.
   */
  private loop(): void {
    if (!this.analyser || !this.dataArray) return;

    this.analyser.getByteFrequencyData(this.dataArray);

    // Calcular RMS (Root Mean Square) do espectro de frequencia
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const normalized = this.dataArray[i] / 255;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / this.dataArray.length);

    // Amplificar e clampar para range [0, 1]
    const amplified = Math.min(rms * 2.5, 1.0);

    // Suavizar para evitar "tremedeira" da boca
    this.smoothedValue += (amplified - this.smoothedValue) * this.smoothingFactor;

    // Threshold minimo: abaixo de 0.05 considera boca fechada
    const finalValue = this.smoothedValue < 0.05 ? 0 : this.smoothedValue;

    this.callback(finalValue);

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  /**
   * Para a reproducao e limpa todos os recursos.
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.source) {
      try { this.source.stop(); } catch { /* pode ja ter parado */ }
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.smoothedValue = 0;
    this.callback(0); // fecha a boca
  }

  /**
   * Retorna true se esta tocando audio / fazendo lip sync.
   */
  get isPlaying(): boolean {
    return this.source !== null && this.audioContext !== null;
  }
}
