# Efeito de scan / depth-map da Athena (React + WebGPU)

Este é o efeito exato que você enviou (three.js WebGPU + TSL: depth-map reagindo
ao mouse, máscara de pontos com ruído e bloom), empacotado como um componente
React reutilizável para envolver um card de gráfico.

> Por que não está direto nas telas da Athena (`.dc.html`): elas rodam num
> ambiente sem bundler e o WebGPU (`three/webgpu`, `three/tsl`) não carrega de
> forma confiável ali. Por isso o `Athena Sales Card.dc.html` traz uma versão do
> scan feita em CSS. Este pacote é a versão React verdadeira, para o app Next.js.

## Instalar

```bash
npm i three@^0.170 @react-three/fiber@^9 @react-three/drei@^9
```

## Usar (Next.js, App Router)

O componente usa WebGPU e só pode rodar no cliente:

```tsx
import dynamic from 'next/dynamic';

const DepthScanCard = dynamic(() => import('@/components/DepthScanCard'), { ssr: false });

export default function Card() {
  return (
    <div style={{ position: 'relative', width: 375, height: 300, borderRadius: 30, overflow: 'hidden', background: '#000' }}>
      <DepthScanCard
        textureSrc="/cards/vendas.png"     // screenshot/textura do gráfico
        depthSrc="/cards/vendas-depth.webp" // mapa de profundidade (branco=perto)
        scanColor={[0.77, 0.12, 0.12]}      // vermelho Athena #c41e1e
      />
      {/* sobreponha aqui os números e a tabela do card, com pointer-events:none no topo */}
    </div>
  );
}
```

## Props

| prop         | tipo                       | padrão      | o quê |
|--------------|----------------------------|-------------|-------|
| `textureSrc` | `string`                   |,           | imagem base do card |
| `depthSrc`   | `string`                   |,           | depth-map (branco = perto, preto = longe) |
| `scanColor`  | `[number,number,number]`   | `[1,0,0]`   | cor do scan em RGB 0..1 |
| `strength`   | `number`                   | `1`         | intensidade do bloom |
| `threshold`  | `number`                   | `1`         | limiar do bloom |

## Como gerar o depth-map

- Ferramenta rápida: Depth Anything / MiDaS (qualquer gerador de profundidade).
- Ou pinte à mão: o que deve "saltar" no scan mais claro, o fundo mais escuro.

## Fallback

WebGPU exige Chrome/Edge 113+ (ou flag no Safari/Firefox). Detecte e caia para
uma imagem estática quando `navigator.gpu` não existir:

```tsx
const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
return hasWebGPU ? <DepthScanCard .../> : <img src={textureSrc} alt="" />;
```
