/**
 * Live2DCanvas - Renderizador do modelo Live2D Beyonder no navegador.
 *
 * Usa PixiJS v7 + pixi-live2d-display para carregar o modelo .moc3,
 * gerenciar animacoes idle, expressoes e lip sync.
 *
 * O componente expoe metodos via ref (useImperativeHandle) para que
 * o pai possa controlar expressoes e lip sync externamente.
 *
 * Modelo Beyonder (Jack in the Box):
 * - 36 parametros: cabeca, olhos, boca, corpo, emotes
 * - 4 sistemas de fisica: cadarco, perna, gravata, bracos
 * - 7 expressoes: smile, angy, worried, blush, aww, oh, ehh
 * - Parametros de emote toggle: Param7-Param13
 *   Param7  = eyebag (oh expression)
 *   Param8  = aww
 *   Param9  = depressed (ehh expression)
 *   Param10 = angy
 *   Param11 = blush
 *   Param12 = sweat (worried expression)
 *   Param13 = neutral
 *
 * Requisitos:
 * - Cubism Core SDK (live2dcubismcore.min.js) carregado via <script>
 * - Modelo em /public/beyonder/ com model3.json atualizado
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
  ({ width = 500, height = 600, modelPath = '/beyonder/jack in the box.model3.json', onModelReady }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const appRef = useRef<any>(null);
    const modelRef = useRef<any>(null);
    const idleFrameRef = useRef<number | null>(null);

    // Expor metodos para o pai
    useImperativeHandle(ref, () => ({
      setExpression: (name: string) => {
        const model = modelRef.current;
        if (!model) return;
        try {
          // pixi-live2d-display: model.expression(name) e o shorthand correto
          if (typeof model.expression === 'function') {
            model.expression(name);
          } else {
            // fallback: acesso direto ao expressionManager
            const mgr = model.internalModel?.motionManager?.expressionManager;
            if (mgr && typeof mgr.setExpression === 'function') {
              mgr.setExpression(name);
            }
          }
        } catch (err) {
          console.warn('[Beyonder] Erro ao setar expressao:', name, err);
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
          if (typeof model.expression === 'function') {
            model.expression(); // sem argumento = reset
          } else {
            const mgr = model.internalModel?.motionManager?.expressionManager;
            if (mgr && typeof mgr.setExpression === 'function') {
              mgr.setExpression(null);
            }
          }
        } catch { /* silencioso */ }
      },

      getModel: () => modelRef.current,
    }));

    // Animacao idle (respiracao + piscar + balanco suave)
    const idleLoop = useCallback(() => {
      const model = modelRef.current;
      if (!model?.internalModel?.coreModel) {
        idleFrameRef.current = requestAnimationFrame(idleLoop);
        return;
      }

      const core = model.internalModel.coreModel;
      const now = performance.now() / 1000;

      // Respiracao suave (ciclo de ~3.5s)
      const breathValue = Math.sin(now * 1.8) * 0.5 + 0.5;
      try { core.setParameterValueById('ParamBreath', breathValue); } catch {}

      // Piscar natural (a cada ~4-5 segundos, variacao para nao parecer mecanico)
      const blinkPeriod = 4.2 + Math.sin(now * 0.1) * 0.8; // varia entre 3.4 e 5.0s
      const blinkCycle = now % blinkPeriod;
      let eyeOpen = 1.0;
      if (blinkCycle > blinkPeriod - 0.15 && blinkCycle < blinkPeriod - 0.075) {
        eyeOpen = 1.0 - ((blinkCycle - (blinkPeriod - 0.15)) / 0.075);
      } else if (blinkCycle >= blinkPeriod - 0.075) {
        eyeOpen = (blinkCycle - (blinkPeriod - 0.075)) / 0.075;
      }
      try {
        core.setParameterValueById('ParamEyeLOpen', eyeOpen);
        core.setParameterValueById('ParamEyeROpen', eyeOpen);
      } catch {}

      // Leve balanco da cabeca (microanima para parecer vivo)
      const headX = Math.sin(now * 0.5) * 3 + Math.sin(now * 1.3) * 1;
      const headY = Math.sin(now * 0.3) * 2 + Math.cos(now * 0.7) * 0.5;
      try {
        core.setParameterValueById('ParamAngleX', headX);
        core.setParameterValueById('ParamAngleY', headY);
      } catch {}

      // Corpo acompanha cabeca levemente
      const bodyX = Math.sin(now * 0.4) * 1.5;
      const bodyY = Math.sin(now * 0.25) * 1;
      try {
        core.setParameterValueById('ParamBodyAngleX', bodyX);
        core.setParameterValueById('ParamBodyAngleY', bodyY);
      } catch {}

      // Olhar suave seguindo a "camera"
      const eyeX = Math.sin(now * 0.6) * 0.3;
      const eyeY = Math.sin(now * 0.4) * 0.2;
      try {
        core.setParameterValueById('ParamEyeBallX', eyeX);
        core.setParameterValueById('ParamEyeBallY', eyeY);
      } catch {}

      idleFrameRef.current = requestAnimationFrame(idleLoop);
    }, []);

    useEffect(() => {
      if (!canvasRef.current) return;

      let destroyed = false;

      const init = async () => {
        // Import dinamico para evitar SSR (PixiJS precisa de window/document)
        const PIXI = await import('pixi.js');
        const { Live2DModel } = await import('pixi-live2d-display/cubism4');

        // Registrar ticker do Live2D no PixiJS
        Live2DModel.registerTicker(PIXI.Ticker as any);

        if (destroyed) return;

        // Criar app PixiJS com fundo transparente
        const app = new PIXI.Application({
          view: canvasRef.current!,
          width,
          height,
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
        appRef.current = app;

        try {
          // Carregar modelo Live2D
          const model = await Live2DModel.from(modelPath, {
            autoInteract: false,
            autoUpdate: true,
          });

          if (destroyed) return;

          modelRef.current = model;

          // Posicionar e escalar para caber no canvas
          const scale = Math.min(width / model.width, height / model.height) * 0.85;
          model.scale.set(scale);
          model.x = (width - model.width * scale) / 2;
          model.y = (height - model.height * scale) / 2 + 20;

          // Desabilitar event system do PixiJS no modelo (fix isInteractive error)
          (model as any).eventMode = 'none';
          (model as any).interactive = false;
          (model as any).interactiveChildren = false;

          app.stage.addChild(model as any);

          // Iniciar idle loop
          idleLoop();

          onModelReady?.();
          console.log('[Beyonder] Modelo carregado com sucesso. Parametros:', {
            expressions: model.internalModel?.motionManager?.expressionManager?.definitions?.length || 0,
          });
        } catch (err) {
          console.error('[Beyonder] Erro ao carregar modelo:', err);
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
