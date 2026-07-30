'use client';

// DepthScanCard, efeito de scan vermelho + depth-map (three.js WebGPU / TSL)
// Adaptado do snippet enviado para envolver um CARD de gráfico da Athena.
// Requer WebGPU (Chrome/Edge 113+). Cai para o card estático se indisponível.
//
// Deps (package.json):
//   three@^0.170  @react-three/fiber@^9  @react-three/drei@^9
// Next.js: importe este componente com dynamic(() => import('./DepthScanCard'), { ssr:false })

import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { useAspect, useTexture } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three/webgpu';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
import {
  abs, blendScreen, float, mod, mx_cell_noise_float, oneMinus,
  smoothstep, texture, uniform, uv, vec2, vec3, pass, mix, add,
} from 'three/tsl';

extend(THREE as any);

type Props = {
  /** imagem base do card (ex.: screenshot do gráfico ou textura) */
  textureSrc: string;
  /** depth-map correspondente (branco = perto, preto = longe) */
  depthSrc: string;
  /** cor do scan em RGB 0..1, vermelho Athena por padrão */
  scanColor?: [number, number, number];
  strength?: number;
  threshold?: number;
};

const PostProcessing = ({
  strength = 1, threshold = 1, scanColor = [1, 0, 0] as [number, number, number],
}) => {
  const { gl, scene, camera } = useThree();
  const progressRef = useRef({ value: 0 });

  const render = useMemo(() => {
    const postProcessing = new THREE.PostProcessing(gl as any);
    const scenePass = pass(scene, camera);
    const scenePassColor = scenePass.getTextureNode('output');
    const bloomPass = bloom(scenePassColor, strength, 0.5, threshold);

    const uScanProgress = uniform(0);
    progressRef.current = uScanProgress;

    const uvY = uv().y;
    const scanWidth = float(0.05);
    const scanLine = smoothstep(0, scanWidth, abs(uvY.sub(float(uScanProgress.value))));
    const redOverlay = vec3(...scanColor).mul(oneMinus(scanLine)).mul(0.4);

    const withScanEffect = mix(
      scenePassColor,
      add(scenePassColor, redOverlay),
      smoothstep(0.9, 1.0, oneMinus(scanLine)),
    );

    postProcessing.outputNode = withScanEffect.add(bloomPass);
    return postProcessing;
  }, [camera, gl, scene, strength, threshold, scanColor]);

  useFrame(({ clock }) => {
    progressRef.current.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    render.renderAsync();
  }, 1);

  return null;
};

const WIDTH = 300;
const HEIGHT = 300;

const Scene = ({ textureSrc, depthSrc, scanColor }: Required<Pick<Props, 'textureSrc' | 'depthSrc' | 'scanColor'>>) => {
  const [rawMap, depthMap] = useTexture([textureSrc, depthSrc]);

  const { material, uniforms } = useMemo(() => {
    const uPointer = uniform(new THREE.Vector2(0));
    const uProgress = uniform(0);
    const strength = 0.01;

    const tDepthMap = texture(depthMap);
    const tMap = texture(rawMap, uv().add(tDepthMap.r.mul(uPointer).mul(strength)));

    const aspect = float(WIDTH).div(HEIGHT);
    const tUv = vec2(uv().x.mul(aspect), uv().y);
    const tiling = vec2(120.0);
    const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0);
    const brightness = mx_cell_noise_float(tUv.mul(tiling).div(2));
    const dist = float(tiledUv.length());
    const dot = float(smoothstep(0.5, 0.49, dist)).mul(brightness);
    const flow = oneMinus(smoothstep(0, 0.02, abs(tDepthMap.sub(uProgress))));
    const mask = dot.mul(flow).mul(vec3(scanColor[0] * 10, scanColor[1] * 10, scanColor[2] * 10));
    const final = blendScreen(tMap, mask);

    const material = new THREE.MeshBasicNodeMaterial({ colorNode: final });
    return { material, uniforms: { uPointer, uProgress } };
  }, [rawMap, depthMap, scanColor]);

  const [w, h] = useAspect(WIDTH, HEIGHT);
  useFrame(({ clock }) => { uniforms.uProgress.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5; });
  useFrame(({ pointer }) => { uniforms.uPointer.value = pointer; });

  const scaleFactor = 0.4;
  return (
    <mesh scale={[w * scaleFactor, h * scaleFactor, 1]} material={material}>
      <planeGeometry />
    </mesh>
  );
};

export default function DepthScanCard({
  textureSrc, depthSrc, scanColor = [1, 0, 0], strength = 1, threshold = 1,
}: Props) {
  return (
    <Canvas
      flat
      gl={async (props) => {
        const renderer = new THREE.WebGPURenderer(props as any);
        await renderer.init();
        return renderer;
      }}
    >
      <PostProcessing strength={strength} threshold={threshold} scanColor={scanColor} />
      <Scene textureSrc={textureSrc} depthSrc={depthSrc} scanColor={scanColor} />
    </Canvas>
  );
}
