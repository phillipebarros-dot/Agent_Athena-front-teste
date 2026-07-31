'use client';
import React, { useEffect, useRef, useState } from 'react';

/**
 * BeyonderLive2D - Componente Live2D real usando pixi-live2d-display
 *
 * Modelo: Jack in the Box VTS (renomeado Beyonder)
 * Physics: 4 settings (shoelace, leg, tie, arms) com gravidade
 * Expressoes: smile, angy, worried, blush, aww, oh, ehh
 * Groups: EyeBlink (ParamEyeLOpen, ParamEyeROpen), LipSync (ParamMouthOpenY)
 */

// Mapeamento emocao -> expressao do modelo
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
  /** Emocao atual para expressao do modelo */
  emotion?: string;
  /** Se o modelo esta "falando" (ativa lip sync) */
  speaking?: boolean;
  /** Se esta expandido (grande) ou minimizado (icone) */
  expanded?: boolean;
  /** Callback ao clicar no modelo */
  onClick?: () => void;
  /** Texto do balao de fala */
  speechText?: string;
}

export function BeyonderLive2D({
  emotion = 'neutral',
  speaking = false,
  expanded = false,
  onClick,
  speechText,
}: BeyonderLive2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const lipSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializa PixiJS + Live2D Model
  useEffect(() => {
    if (!canvasRef.current) return;

    let destroyed = false;

    async function init() {
      try {
        // Dynamic imports para evitar SSR issues
        const PIXI = await import('pixi.js');
        const { Live2DModel } = await import('pixi-live2d-display');

        // Expor PIXI globalmente para o plugin
        if (typeof window !== 'undefined') {
          (window as any).PIXI = PIXI;
        }

        if (destroyed) return;

        // Criar app PixiJS
        const app = new PIXI.Application({
          view: canvasRef.current!,
          autoStart: true,
          backgroundAlpha: 0,
          resizeTo: canvasRef.current!.parentElement || undefined,
          antialias: true,
        });

        appRef.current = app;

        // Carregar modelo Live2D
        const model = await Live2DModel.from(
          '/beyonder/model/jack in the box.model3.json',
          { autoInteract: false }
        );

        if (destroyed) {
          model.destroy();
          return;
        }

        modelRef.current = model;

        // Escala e posicao
        const scale = expanded ? 0.35 : 0.18;
        model.scale.set(scale);
        model.anchor.set(0.5, 0.5);

        // Centralizar
        const w = app.renderer.width;
        const h = app.renderer.height;
        model.x = w / 2;
        model.y = h / 2;

        app.stage.addChild(model as any);

        // Mouse tracking: olhos seguem o cursor
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

  // Lip sync quando falando
  useEffect(() => {
    if (!modelRef.current || !loaded) return;

    if (speaking) {
      lipSyncIntervalRef.current = setInterval(() => {
        if (!modelRef.current?.internalModel?.coreModel) return;
        const core = modelRef.current.internalModel.coreModel;
        const value = Math.random() * 0.7 + 0.1;
        try {
          core.setParameterValueById('ParamMouthOpenY', value);
        } catch { /* ignore */ }
      }, 100);
    } else {
      if (lipSyncIntervalRef.current) {
        clearInterval(lipSyncIntervalRef.current);
        lipSyncIntervalRef.current = null;
      }
      try {
        modelRef.current?.internalModel?.coreModel?.setParameterValueById('ParamMouthOpenY', 0);
      } catch { /* ignore */ }
    }

    return () => {
      if (lipSyncIntervalRef.current) {
        clearInterval(lipSyncIntervalRef.current);
        lipSyncIntervalRef.current = null;
      }
    };
  }, [speaking, loaded]);

  const containerStyle: React.CSSProperties = expanded
    ? {
        width: 320, height: 400,
        position: 'relative', cursor: 'pointer',
        transition: 'all 0.3s ease',
      }
    : {
        width: 80, height: 80,
        position: 'relative', cursor: 'pointer',
        borderRadius: '50%', overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(221, 0, 4, 0.3)',
        border: '2px solid var(--red-dim)',
        transition: 'all 0.3s ease',
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
            background: 'var(--bg-surface)',
            borderRadius: expanded ? 12 : '50%',
          }}>
            <div style={{
              width: 24, height: 24, border: '3px solid var(--red)',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        )}
        {error && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-surface)', fontSize: 10, color: 'var(--muted)',
            borderRadius: expanded ? 12 : '50%', padding: 8, textAlign: 'center',
          }}>
            Beyonder offline
          </div>
        )}
      </div>

      {/* Balao de fala */}
      {expanded && speechText && (
        <div style={{
          position: 'absolute', top: -10, left: '110%',
          minWidth: 200, maxWidth: 320,
          padding: '12px 16px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: '16px 16px 16px 4px',
          fontSize: 13, lineHeight: 1.5, color: 'var(--white)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'fadeInUp 0.3s ease',
        }}>
          {speechText}
          <div style={{
            position: 'absolute', left: -8, bottom: 16,
            width: 0, height: 0,
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderRight: '8px solid var(--bg-panel)',
          }} />
        </div>
      )}
    </div>
  );
}

export default BeyonderLive2D;
