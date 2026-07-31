/**
 * Live2DCanvas - Renderizador do modelo Live2D Jack no navegador.
 *
 * Usa PixiJS v7 + pixi-live2d-display para carregar o modelo .moc3,
 * gerenciar animacoes idle, expressoes e lip sync.
 *
 * O componente expoe metodos via ref (useImperativeHandle) para que
 * o pai possa controlar expressoes e lip sync externamente.
 *
 * Requisitos:
 * - Cubism Core SDK (live2dcubismcore.min.js) carregado via <script>
 * - Modelo em /public/jack/ com model3.json atualizado
 */
'use client';
import React, { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';

export interface Live2DCanvasHandle {
  setExpression: (name: string) => void;
  setMouthValue: (value: number) => void;
  resetExpression: () => void;
  getModel: () => any;
}

interface Live2DCanvasProps {
  width?: number;
  height?: number;
  modelPath?: string;
  onModelReady?: () => void;
}

const Live2DCanvas = forwardRef<Live2DCanvasHandle, Live2DCanvasProps>(
  ({ width = 500, height = 600, modelPath = '/jack/jack in the box.model3.json', onModelReady }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const appRef = useRef<any>(null);
    const modelRef = useRef<any>(null);
    const breathTimerRef = useRef<number>(0);
    const blinkTimerRef = useRef<number>(0);
    const idleFrameRef = useRef<number | null>(null);

    // Expor metodos para o pai
    useImperativeHandle(ref, () => ({
      setExpression: (name: string) => {
        const model = modelRef.current;
        if (!model) return;
        try {
          // pixi-live2d-display usa expressionManager
          const mgr = model.internalModel?.motionManager?.expressionManager;
          if (mgr && typeof mgr.setExpression === 'function') {
            mgr.setExpression(name);
          }
        } catch (err) {
          console.warn('[Live2D] Erro ao setar expressao:', name, err);
        }
      },

      setMouthValue: (value: number) => {
        const model = modelRef.current;
        if (!model?.internalModel?.coreModel) return;
        try {
          model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', value);
        } catch { /* silencioso */ }
      },

      resetExpression: () => {
        const model = modelRef.current;
        if (!model) return;
        try {
          const mgr = model.internalModel?.motionManager?.expressionManager;
          if (mgr && typeof mgr.resetExpression === 'function') {
            mgr.resetExpression();
          }
        } catch { /* silencioso */ }
      },

      getModel: () => modelRef.current,
    }));

    // Animacao idle (respiracao + piscar)
    const idleLoop = useCallback(() => {
      const model = modelRef.current;
      if (!model?.internalModel?.coreModel) {
        idleFrameRef.current = requestAnimationFrame(idleLoop);
        return;
      }

      const core = model.internalModel.coreModel;
      const now = performance.now() / 1000;

      // Respiracao suave (seno)
      const breathValue = Math.sin(now * 1.8) * 0.5 + 0.5;
      try { core.setParameterValueById('ParamBreath', breathValue); } catch {}

      // Piscar periodico (a cada ~4 segundos)
      const blinkCycle = now % 4;
      let eyeOpen = 1.0;
      if (blinkCycle > 3.7 && blinkCycle < 3.85) {
        eyeOpen = 1.0 - ((blinkCycle - 3.7) / 0.15); // fecha
      } else if (blinkCycle >= 3.85 && blinkCycle < 4.0) {
        eyeOpen = (blinkCycle - 3.85) / 0.15; // abre
      }
      try {
        core.setParameterValueById('ParamEyeLOpen', eyeOpen);
        core.setParameterValueById('ParamEyeROpen', eyeOpen);
      } catch {}

      // Leve balanco da cabeca
      const headX = Math.sin(now * 0.5) * 3;
      const headY = Math.sin(now * 0.3) * 2;
      try {
        core.setParameterValueById('ParamAngleX', headX);
        core.setParameterValueById('ParamAngleY', headY);
      } catch {}

      idleFrameRef.current = requestAnimationFrame(idleLoop);
    }, []);

    useEffect(() => {
      if (!canvasRef.current) return;

      let destroyed = false;

      const init = async () => {
        // Import dinamico para evitar SSR
        const PIXI = await import('pixi.js');
        const { Live2DModel } = await import('pixi-live2d-display');

        // Registrar Live2D no PixiJS
        Live2DModel.registerTicker(PIXI.Ticker);

        if (destroyed) return;

        // Criar app PixiJS
        const app = new PIXI.Application({
          view: canvasRef.current!,
          width,
          height,
          backgroundAlpha: 0, // fundo transparente
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
        appRef.current = app;

        try {
          // Carregar modelo
          const model = await Live2DModel.from(modelPath, {
            autoInteract: false,
            autoUpdate: true,
          });

          if (destroyed) return;

          modelRef.current = model;

          // Posicionar e escalar o modelo no centro
          const scale = Math.min(width / model.width, height / model.height) * 0.85;
          model.scale.set(scale);
          model.x = (width - model.width * scale) / 2;
          model.y = (height - model.height * scale) / 2 + 20;

          app.stage.addChild(model);

          // Iniciar idle loop
          idleLoop();

          onModelReady?.();
          console.log('[Live2D] Modelo Jack carregado com sucesso');
        } catch (err) {
          console.error('[Live2D] Erro ao carregar modelo:', err);
        }
      };

      init();

      return () => {
        destroyed = true;
        if (idleFrameRef.current) cancelAnimationFrame(idleFrameRef.current);
        if (appRef.current) {
          try { appRef.current.destroy(true); } catch {}
          appRef.current = null;
        }
        modelRef.current = null;
      };
    }, [width, height, modelPath, idleLoop, onModelReady]);

    return (
      <canvas
        ref={canvasRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'block',
        }}
      />
    );
  }
);

Live2DCanvas.displayName = 'Live2DCanvas';
export default Live2DCanvas;
