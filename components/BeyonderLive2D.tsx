'use client';
import React, { useEffect, useRef, useState } from 'react';

/**
 * BeyonderLive2D - Modelo Live2D completo, sem circulo, sem recriacao.
 *
 * O modelo e criado UMA VEZ e nunca destruido/recriado (evita WebGL errors).
 * Canvas fixo que mostra o personagem INTEIRO (sentado na cadeira).
 */

const EMOTION_MAP: Record<string, string> = {
  greeting: 'smile', happy: 'smile', thinking: 'ehh',
  confused: 'worried', explaining: 'aww', surprised: 'oh',
  angry: 'angy', shy: 'blush', neutral: 'smile', error: 'worried',
};

interface BeyonderLive2DProps {
  emotion?: string;
  speaking?: boolean;
  analyserNode?: AnalyserNode | null;
}

export function BeyonderLive2D({
  emotion = 'neutral',
  speaking = false,
  analyserNode,
}: BeyonderLive2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const lipSyncRafRef = useRef<number | null>(null);
  const lipSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Canvas largo o suficiente pra modelo inteiro (bracos, cadeira)
  const CANVAS_W = 220;
  const CANVAS_H = 320;

  // Inicializa UMA VEZ (sem dependencia de expanded)
  useEffect(() => {
    if (!canvasRef.current) return;
    let destroyed = false;

    async function init() {
      try {
        const PIXI = await import('pixi.js');
        const { Live2DModel } = await import('pixi-live2d-display/cubism4');

        if (typeof window !== 'undefined') (window as any).PIXI = PIXI;
        Live2DModel.registerTicker(PIXI.Ticker as any);

        if (destroyed) return;

        const app = new PIXI.Application({
          view: canvasRef.current!,
          autoStart: true,
          backgroundAlpha: 0,
          width: CANVAS_W,
          height: CANVAS_H,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        appRef.current = app;

        const model = await Live2DModel.from(
          '/beyonder/model/jack in the box.model3.json',
          { autoInteract: false }
        );

        if (destroyed) { model.destroy(); return; }
        modelRef.current = model;

        // Escala pra caber o modelo INTEIRO no canvas
        const scaleX = CANVAS_W / model.width;
        const scaleY = CANVAS_H / model.height;
        const fitScale = Math.min(scaleX, scaleY) * 0.78;
        model.scale.set(fitScale);

        // Centralizar
        model.x = (CANVAS_W - model.width * fitScale) / 2;
        model.y = (CANVAS_H - model.height * fitScale) / 2;

        (model as any).eventMode = 'none';
        (model as any).interactive = false;
        (model as any).interactiveChildren = false;

        app.stage.addChild(model as any);

        // Mouse tracking
        const onMouseMove = (e: MouseEvent) => {
          if (!canvasRef.current || !modelRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const focusX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
          const focusY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
          modelRef.current.focus(focusX * 30, focusY * 30);
        };
        window.addEventListener('mousemove', onMouseMove);
        (model as any)._mouseCleanup = () => window.removeEventListener('mousemove', onMouseMove);

        try { model.expression(EMOTION_MAP[emotion] || 'smile'); } catch {}
        setLoaded(true);
      } catch (err: any) {
        console.error('Erro Live2D:', err);
        setError(err.message || 'Falha');
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
  }, []); // SEM dependencias -- cria UMA VEZ

  // Expressao
  useEffect(() => {
    if (!modelRef.current || !loaded) return;
    try { modelRef.current.expression(EMOTION_MAP[emotion] || 'smile'); } catch {}
  }, [emotion, loaded]);

  // Lip sync
  useEffect(() => {
    if (!modelRef.current || !loaded) return;
    if (lipSyncRafRef.current) { cancelAnimationFrame(lipSyncRafRef.current); lipSyncRafRef.current = null; }
    if (lipSyncIntervalRef.current) { clearInterval(lipSyncIntervalRef.current); lipSyncIntervalRef.current = null; }

    if (speaking && analyserNode) {
      const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      let smooth = 0;
      const update = () => {
        if (!modelRef.current?.internalModel?.coreModel) { lipSyncRafRef.current = requestAnimationFrame(update); return; }
        analyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        const bins = Math.min(16, dataArray.length);
        for (let i = 0; i < bins; i++) sum += dataArray[i];
        smooth = smooth * 0.4 + (sum / bins / 255) * 0.6;
        try { modelRef.current.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', Math.min(0.95, smooth * 1.8)); } catch {}
        lipSyncRafRef.current = requestAnimationFrame(update);
      };
      lipSyncRafRef.current = requestAnimationFrame(update);
    } else if (speaking) {
      lipSyncIntervalRef.current = setInterval(() => {
        if (!modelRef.current?.internalModel?.coreModel) return;
        try { modelRef.current.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', Math.random() * 0.7 + 0.1); } catch {}
      }, 100);
    } else {
      let v = 0.5;
      const close = () => {
        if (!modelRef.current?.internalModel?.coreModel) return;
        v *= 0.7;
        if (v < 0.01) { try { modelRef.current.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', 0); } catch {} return; }
        try { modelRef.current.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', v); } catch {}
        lipSyncRafRef.current = requestAnimationFrame(close);
      };
      lipSyncRafRef.current = requestAnimationFrame(close);
    }

    return () => {
      if (lipSyncRafRef.current) { cancelAnimationFrame(lipSyncRafRef.current); lipSyncRafRef.current = null; }
      if (lipSyncIntervalRef.current) { clearInterval(lipSyncIntervalRef.current); lipSyncIntervalRef.current = null; }
    };
  }, [speaking, loaded, analyserNode]);

  return (
    <div style={{ width: CANVAS_W, height: CANVAS_H, position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {!loaded && !error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
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
          fontSize: 10, color: '#888', textAlign: 'center', padding: 8,
        }}>
          Beyonder offline
        </div>
      )}
    </div>
  );
}

export default BeyonderLive2D;
