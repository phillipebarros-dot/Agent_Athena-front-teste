# Athena, app web (Next.js)

Migração das três telas da Athena (protótipos HTML) para um projeto React/Next.js
real, pronto para o time continuar e plugar no backend Python (LangGraph + MCP + SSE).

## Rodar

```bash
cd athena-web
npm install
npm run dev
# abre em http://localhost:3000  → redireciona para /chat
```

## Rotas

| Rota | Arquivo | O que é |
|---|---|---|
| `/chat` | `app/chat/page.tsx` | Conversa: boas-vindas, mensagem com proveniência, gráfico/tabela, contexto fixado, painel de ferramentas, modal de exportação |
| `/admin` | `app/admin/page.tsx` | Auditoria: KPIs, 9 gráficos, curadoria de aprendizado, dicionário, consultas (com drawer de detalhe), usuários e permissões |
| `/login` | `app/login/page.tsx` | Login com malha de pontos reativa (canvas) |

## Arquitetura

- **App Router** (Next 15 + React 19), TypeScript, zero dependência de build de CSS.
- **Tokens da marca** em `app/globals.css` (`:root` escuro, `:root.light` claro) -
  a mesma paleta dos protótipos, portada 1:1. Cada tela alterna tema pela classe
  `light` no `<html>`.
- **Estilo inline** via helper `css("prop:val; …")` em `lib/dc.tsx`, que converte a
  string CSS dos protótipos em `React.CSSProperties`. O componente `<B>` do mesmo
  arquivo dá estados `hover`/`active`/`focus` por string CSS; `<IC>` desenha ícones SVG.
- **Estado** com `useState` local em cada página (tema, aba, filtros, drawer, turno
  de conversa). Os dados são mocks nas próprias páginas, o ponto onde entra o backend.

## Ligar no backend (guia de migração)

| Elemento | Fonte | Onde trocar o mock |
|---|---|---|
| Resposta em streaming | `POST /chat/stream` (SSE) | `app/chat/page.tsx`, estado `generating` + bolha da Athena |
| Isolar conversa | `thread_id` no PostgreSQL checkpointer | lista de `folders` / seleção de conversa |
| Proveniência / SQL | trace do LangSmith + tool call | bloco "Como cheguei nesse resultado" |
| Autocomplete de veículos | tool `validar_veiculo` | array `autocomplete` |
| Curadoria / regras | fila que alimenta o system prompt | `/admin` aba Aprendizado (`curation`, `approved`) |
| Fontes MCP | status dos conectores do Camilo | `/admin` `sourceNav` + card de sincronização |
| Auditoria de sessões | observabilidade (BigQuery) | `/admin` aba Consultas (`allAudit`) |

## Efeito de scan (opcional, WebGPU)

`components/scan-effect/` traz o `DepthScanCard` (three.js WebGPU + TSL: depth-map
reativo ao mouse + bloom). Requer `three`, `@react-three/fiber`, `@react-three/drei`
e um navegador com WebGPU. Veja `components/scan-effect/README.md`.

## Notas

- As páginas usam `<img src="/athena-logo.png">` (arquivos em `public/`).
- Os estados interativos (tema, abas, sandbox/produção, turnos, drawer, filtros)
  já funcionam com os mocks, é o comportamento de referência para o app real.
