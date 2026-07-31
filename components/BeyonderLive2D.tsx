'use client';
import React, { useEffect, useRef, useState } from 'react';

/**
 * BeyonderLive2D - Componente Live2D real usando pixi-live2d-display
 *
 * Modelo: Jack in the Box VTS (renomeado Beyonder)
 * Physics: 4 settings (shoelace, leg, tie, arms) com gravidade
 * Expressoes: smile, angy, worried, blush, aww, oh, ehh
 * Groups: EyeBlink (ParamEyeLOpen, ParamEyeROpen), LipSync (ParamMouthOpenY)
 *
 * Lip sync: Se analyserNode e fornecido, usa frequencias reais do audio.
 * Senao, usa simulacao por random quando speaking=true.
 */

const EMOTION_MAP: Record<string, string> = {
  greeting: 'smile',
  happy: 'smile',
  thinking: 'ehh',
  confused: 'worried',
  explaining: 'aww',
  surprised: 'oh',
  angry: 'angy',
  shy: 'blush',
  neutral: 'smile',
  error: 'worried',
};

interface BeyonderLive2DProps {
  emotion?: string;
  speaking?: boolean;
  expanded?: boolean;
  onClick?: () => void;
  speechText?: string;
  /** AnalyserNode do Web Audio API para lip sync real */
  analyserNode?: AnalyserNode | null;
}

export function BeyonderLive2D({
  emotion = 'neutral',
  speaking = false,
  expanded = false,
  onClick,
  speechText,
  analyserNode,
}: BeyonderLive2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const lipSyncRafRef = useRef<number | null>(null);
  const lipSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializa PixiJS + Live2D Model
  useEffect(() => {
    if (!canvasRef.current) return;

    let destroyed = false;

    async function init() {
      try {
        const PIXI = await import('pixi.js');
        const { Live2DModel } = await import('pixi-live2d-display/cubism4');

        if (typeof window !== 'undefined') {
          (window as any).PIXI = PIXI;
        }

        Live2DModel.registerTicker(PIXI.Ticker as any);

        if (destroyed) return;

        const canvasW = expanded ? 200 : 120;
        const canvasH = expanded ? 320 : 180;

        const app = new PIXI.Application({
          view: canvasRef.current!,
          autoStart: true,
          backgroundAlpha: 0,
          width: canvasW,
          height: canvasH,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        appRef.current = app;

        const model = await Live2DModel.from(
          '/beyonder/model/jack in the box.model3.json',
          { autoInteract: false }
        );

        if (destroyed) {
          model.destroy();
          return;
        }

        modelRef.current = model;

        const scaleX = canvasW / model.width;
        const scaleY = canvasH / model.height;
        const fitScale = Math.min(scaleX, scaleY) * (expanded ? 0.85 : 0.9);
        model.scale.set(fitScale);

        model.x = (canvasW - model.width * fitScale) / 2;
        model.y = (canvasH - model.height * fitScale) / 2 + (expanded ? 10 : 0);

        (model as any).eventMode = 'none';
        (model as any).interactive = false;
        (model as any).interactiveChildren = false;

        app.stage.addChild(model as any);

        // Mouse tracking
        const onMouseMove = (e: MouseEvent) => {
          if (!canvasRef.current || !modelRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = (e.clientY - rect.top) / rect.height;
          const focusX = (x - 0.5) * 2;
          const focusY = (y - 0.5) * 2;
          modelRef.current.focus(focusX * 30, focusY * 30);
        };
        window.addEventListener('mousemove', onMouseMove);
        (model as any)._mouseCleanup = () => window.removeEventListener('mousemove', onMouseMove);

        // Expressao inicial
        try {
          const expr = EMOTION_MAP[emotion] || 'smile';
          model.expression(expr);
        } catch { /* expressao nao encontrada */ }

        setLoaded(true);
      } catch (err: any) {
        console.error('Erro ao carregar Live2D Beyonder:', err);
        setError(err.message || 'Falha ao carregar modelo');
      }
    }

    init();

    return () => {
      destroyed = true;
      if (lipSyncRafRef.current) cancelAnimationFrame(lipSyncRafRef.current);
      if (lipSyncIntervalRef.current) clearInterval(lipSyncIntervalRef.current);
      if (modelRef.current) {
        const cleanup = (modelRef.current as any)._mouseCleanup;
        if (cleanup) cleanup();
        modelRef.current.destroy();
        modelRef.current = null;
      }
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      setLoaded(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  // Atualizar expressao quando emocao muda
  useEffect(() => {
    if (!modelRef.current || !loaded) return;
    try {
      const expr = EMOTION_MAP[emotion] || 'smile';
      modelRef.current.expression(expr);
    } catch { /* expressao nao encontrada */ }
  }, [emotion, loaded]);

  // Lip sync -- REAL (via analyserNode) ou SIMULADO (random)
  useEffect(() => {
    if (!modelRef.current || !loaded) return;

    // Limpar anterior
    if (lipSyncRafRef.current) { cancelAnimationFrame(lipSyncRafRef.current); lipSyncRafRef.current = null; }
    if (lipSyncIntervalRef.current) { clearInterval(lipSyncIntervalRef.current); lipSyncIntervalRef.current = null; }

    if (speaking && analyserNode) {
      // ---- LIP SYNC REAL: frequencias do audio ----
      const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      let smoothValue = 0;

      const update = () => {
        if (!modelRef.current?.internalModel?.coreModel) {
          lipSyncRafRef.current = requestAnimationFrame(update);
          return;
        }

        analyserNode.getByteFrequencyData(dataArray);

        // Media das frequencias baixas (bins 0-15 ~ 0-600Hz, zona da voz)
        let sum = 0;
        const voiceBins = Math.min(16, dataArray.length);
        for (let i = 0; i < voiceBins; i++) sum += dataArray[i];
        const avg = sum / voiceBins / 255; // normalizar 0-1

        // Smoothing pra evitar tremor
        smoothValue = smoothValue * 0.4 + avg * 0.6;

        // Mapear pra ParamMouthOpenY com range util (0.05 - 0.95)
        const mouthValue = Math.min(0.95, Math.max(0, smoothValue * 1.8));

        try {
          modelRef.current.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', mouthValue);
        } catch { /* ignore */ }

        lipSyncRafRef.current = requestAnimationFrame(update);
      };

      lipSyncRafRef.current = requestAnimationFrame(update);

    } else if (speaking) {
      // ---- LIP SYNC SIMULADO (fallback) ----
      lipSyncIntervalRef.current = setInterval(() => {
        if (!modelRef.current?.internalModel?.coreModel) return;
        const value = Math.random() * 0.7 + 0.1;
        try {
          modelRef.current.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', value);
        } catch { /* ignore */ }
      }, 100);

    } else {
      // ---- PARADO: fechar boca suavemente ----
      let currentMouth = 0.5;
      const closeSmooth = () => {
        if (!modelRef.current?.internalModel?.coreModel) return;
        currentMouth *= 0.7; // decay
        if (currentMouth < 0.01) {
          try { modelRef.current.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', 0); } catch {}
          return;
        }
        try { modelRef.current.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', currentMouth); } catch {}
        lipSyncRafRef.current = requestAnimationFrame(closeSmooth);
      };
      lipSyncRafRef.current = requestAnimationFrame(closeSmooth);
    }

    return () => {
      if (lipSyncRafRef.current) { cancelAnimationFrame(lipSyncRafRef.current); lipSyncRafRef.current = null; }
      if (lipSyncIntervalRef.current) { clearInterval(lipSyncIntervalRef.current); lipSyncIntervalRef.current = null; }
    };
  }, [speaking, loaded, analyserNode]);

  const containerStyle: React.CSSProperties = {
    width: expanded ? 200 : 120,
    height: expanded ? 320 : 180,
    position: 'relative',
    cursor: expanded ? 'default' : 'pointer',
    transition: 'all 0.3s ease',
    /* SEM circulo, SEM borda, SEM overflow hidden */
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={onClick} style={containerStyle}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
        {!loaded && !error && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
            borderRadius: 0,
          }}>
            <div style={{
              width: 24, height: 24, border: '3px solid var(--red, #dd0004)',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        )}
        {error && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
            fontSize: 10, color: 'var(--muted, #888)',
            borderRadius: 0, padding: 8, textAlign: 'center',
          }}>
            Beyonder offline
          </div>
        )}
      </div>
    </div>
  );
}

export default BeyonderLive2D;
