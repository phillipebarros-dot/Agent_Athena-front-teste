# Revisão sênior — status de implementação

Auditoria honesta de cada item do feedback do time e das decisões da reunião de
10/jun contra o que existe no app React (`athena-web/`). Sem enrolação: o que está
pronto no front, o que depende do backend, o que é deploy.

Legenda: ✅ pronto no front · 🔶 precisa de campo/endpoint no backend (patch em
`backend-patch/README.md`) · ⚙️ deploy/infra.

## Feedback do time (planilha TAS)
| Item | Quem | Status | Onde |
|---|---|---|---|
| Perde contexto em muitas perguntas | Victor | 🔶 backend (state/checkpointer) + ✅ "Nova conversa" e histórico reais | chat |
| Resposta na conversa errada | Caroline | 🔶 backend (`thread_id`) | — |
| PIs por status (só faturado) | Caroline/Nathaly | 🔶 backend (regra de status) | — |
| "meio dia parana" não achou | Caroline | 🔶 backend (dicionário de sinônimos) | — |
| RD Atlântida sem registro | Nathaly | 🔶 backend (status) | — |
| Grande Rio x RJ Estado | Stella | 🔶 backend (recorte no prompt) | — |
| Mapear termos do "Visão do Ciclo" | Victor | 🔶 backend (dicionário) | — |
| Renomear conversas / temas | Pedro | ✅ renomear feito; 🔶 pastas (o backend guarda conversa flat, sem tag) | chat |
| Exportação de dados | Pedro | ✅ front abre anexo; 🔶 `/export` real (CSV/PDF) | chat |
| Comportamento em tempo real | Pedro | 🔶 backend (`buscar_web`) | — |
| Tabela Globo Maranhão incompleta | Victor | 🔶 backend (dados/truncamento) | — |
| Travar ao abrir nova conversa | Caroline | ✅ troca de conversa livre, geração por envio não bloqueia | chat |

## Reunião 10/jun (decisões)
| Decisão | Status | Onde |
|---|---|---|
| Citar fonte/tabela na resposta | ✅ bloco "Como cheguei nesse resultado" (query + fontes); 🔶 backend popular os campos | chat + backend-patch |
| Multi-tenant (selecionar cliente) | ✅ seletor de Cliente na sidebar manda `client` no `/chat`; 🔶 backend usar o campo | chat + backend-patch |
| MCP dos dados (Publi/Kantar/TGI) | 🔶 backend/arquitetura | — |
| Dados de mídia digital (Tati/Eduardo) | 🔶 backend (fonte de dados) | — |
| Export CSV/PDF | ✅ UI de anexo; 🔶 `/export` | — |
| Sandbox x produção | ⚙️ deploy (bases clonadas) | DEPLOY-GCP.md |

## Decisões de design que tomei (e por quê)
- **Nada de dado fabricado.** Chat e Admin agora leem do backend real. Sem backend
  configurado, mostram estado vazio/aviso claro — nunca números falsos. Foi o que
  você pediu ("dados reais em tudo").
- **Provenance como `<details>` inline**, não painel gigante: abre sob demanda,
  mostra a SQL em monoespaçada e as fontes como chips. Aparece só quando o backend
  manda os campos — honesto.
- **Mantive o sistema visual coeso da Athena** (estilo inline, preto + vermelho da
  marca) em vez de colar CoreUI/shadcn/animated-ai-chat que você mandou. Misturar
  três kits deixaria com cara de Frankenstein. Recomendo manter assim.
  **Se você quiser mesmo o input animado (framer-motion) na tela de nova conversa,
  eu adapto à marca — me confirma que eu faço.**
- **Admin honesto:** só os 6 dados que o `/audit` devolve viram cartão/gráfico
  (KPIs, assertividade, top usuários, atividade, feedback, conversas + drawer).
  Custo/latência/MCP/dicionário ficam num aviso "dependem de novo endpoint".

## O que eu preciso de você
1. Aplicar (ou me mandar) o `backend-patch/README.md` — sem ele a query e o
   cliente não têm efeito real.
2. Rotacionar as chaves expostas (SECURITY.md) — inegociável antes de subir.
3. Se quiser o input animado na welcome, confirmar — aí eu integro framer-motion.
4. Login de produção: me diga se seguimos com Google OAuth (NextAuth) restrito ao
   domínio (recomendado) que eu implemento no lugar do stub de dev.

## Nível de prontidão
- **Front:** arquitetura sênior (App Router, proxy server-side seguro, sessão
  httpOnly, cliente tipado, tema claro/escuro, favicon com a logo, zero travessão).
- **Falta para operar de verdade:** os itens 🔶 (backend) e ⚙️ (deploy) acima.
