# Athena, Especificação Completa do Produto
### Assistente de mídia da OpusMúltipla · documento vivo
### Atualizado: 29/Jul/2026

> Documento único, sem resumo. Reúne TODAS as ideias, pautas, funcionalidades
> desenhadas nas três telas (Chat, Admin, Login) e TUDO que o backend precisa
> entregar para cada uma funcionar de verdade. Serve de referência para o time
> de front (projeto `athena-web/`, Next.js) e para o time de backend (Python:
> LangGraph + MCP + FastAPI/SSE + PostgreSQL).

---

## 0. Visão geral

A Athena é o assistente que o time de mídia da OpusMúltipla usa para consultar
o **Publi** (BigQuery) e as bases **Kantar** (IBOPE, TGI), a **Tabela Jove** de
preços de TV e o inventário de **Mídia Exterior**, tudo em linguagem natural.
Ela não consulta a web aberta, só fontes licenciadas, e cada resposta mostra
a fonte, o filtro e o recorte usados.

Três telas compõem o produto:

1. **Login** (`/login`), entrada por Google, malha reativa de marca.
2. **Chat** (`/chat`), a conversa, onde 90% do uso acontece.
3. **Admin / Auditoria** (`/admin`), painel do gestor: uso, custo, aprendizado,
   dicionário, consultas e pessoas.

Princípios que atravessam tudo:

- **Nunca afirmar que "não existe"** sem mostrar o filtro que zerou o resultado.
- **Toda resposta é rastreável** (proveniência: SQL, fonte, recorte, tempo).
- **Correção do usuário vira aprendizado**, mas passa por curadoria antes de
  valer para toda a agência.
- **A Athena escolhe o modelo** (Haiku / Sonnet / Opus) pela complexidade da
  pergunta, para equilibrar custo e qualidade.
- **O recorte geográfico é sagrado**: informar sempre a praça exata registrada,
  nunca inferir pela campanha.

---

## 1. Tela de LOGIN (`/login`)

### O que faz
- Entrada única por **Google** (domínio `@grupoom.com.br` / `@opusmultipla.com.br`).
- Fundo com **malha de pontos reativa** (canvas): os pontos se afastam do cursor
  e do medalhão da logo, e um "olhar" varre o campo em órbita.
- Frases rotativas da marca (troca a cada 6s) e selo das fontes (Publi, Kantar,
  BOP, Mídia digital).
- Tema escuro fixo, marca ATHENA / OPUSMÚLTIPLA.

### O que o backend precisa entregar
| Item | Requisito |
|---|---|
| Autenticação | OAuth Google (OIDC), restrito aos domínios da agência |
| Sessão | Token de sessão (JWT ou cookie httpOnly) + refresh |
| Papel do usuário | Retornar o papel (Administrador / Planejamento / Mídia / Atendimento) no login, para o app decidir permissões |
| Primeiro acesso | Marcar `primeiro_acesso` para o Admin ver quem foi convidado mas nunca entrou |
| Auditoria | Registrar login (quem, quando, IP) para a trilha de auditoria |

---

## 2. Tela de CHAT (`/chat`)

A tela principal. Dois estados: **boas-vindas** (conversa nova) e **conversa**
(com mensagens). Estrutura em três colunas: sidebar de conversas · área central
· painel de ferramentas.

### 2.1 Sidebar de conversas
- **Seletor de cliente** fixado no topo (O Boticário, Eudora, Quem disse,
  Berenice?), herda para toda a conversa.
- **Nova conversa** e **busca** com resultados ao vivo (snippet + quando).
- **Pastas/tags**: Visão Ciclo, Planejamentos, Curiosidades, Ciclo 04 Boticário,
  Eudora, cada conversa com um marcador de estado.
- **Badge "nova resposta"** quando a Athena termina algo numa conversa que não
  está aberta (a geração continua em segundo plano).
- **Renomear / fixar / excluir** por conversa (menu de três pontos).
- Link para o **Painel de Auditoria** e bloco de usuário (sair).

### 2.2 Estado de boas-vindas
- Saudação pelo nome + horário.
- **Chips de recorte** (Cliente, Ciclo, Meio) para fixar o contexto ANTES de
  perguntar, resolve a perda de contexto relatada.
- **4 cartões de sugestão** (Investimentos de Mídia, Orçamentos de Produção,
  Status de Tarefas, Tabela de TV) com o tipo de saída (Tabela / Resumo / Lista).
- **Continue de onde parou** (conversas recentes).
- **O que eu consigo consultar**: os 4 domínios (Mídia/Publi, TV/Jove+IBOPE,
  Comportamento/TGI, Mídia Exterior) com quando cada um foi atualizado + nota
  de que a Athena escolhe o modelo e pede aprovação para ações sensíveis.

### 2.3 Estado de conversa
- **Barra de contexto fixado**: chips editáveis (Cliente, Ciclo, Período, Meio,
  Status PI), medidor da janela de contexto (%) e "Nova conversa herdando
  contexto".
- **Aviso entre conversas**: "Athena respondeu em outra conversa" com atalho.
- **Bolha do usuário** e **bolha da Athena** com avatar (logo).
- **Etiqueta de formato**: a Athena marca se respondeu em **tabela** ou
  **gráfico**, com a justificativa (listagem → tabela; comparação/evolução →
  gráfico). O formato é escolhido pelo tipo da pergunta, não por botão.
- **Painel de proveniência** ("Como cheguei nesse resultado"), fechado por
  padrão: 7 filtros, 9 variações de nome, e a **query SQL** executada com tempo,
  bytes lidos e botões Copiar SQL / Editar e rodar de novo.
- **Aviso de resultado vazio**: quando zera, explica o filtro que zerou e oferece
  Ampliar busca / Remover recorte / Buscar só por CNPJ.
- **Gráfico na resposta** (barras) quando a pergunta pede comparação/evolução,
  com legenda, badge de recorte geográfico e valores.
- **Tabela da resposta** com badge de praça, botões Ver em gráfico / Comparar /
  exportar (XLSX, Sheets, CSV, PDF), aviso de **resultado truncado** (mostra 3 de
  529, totais consideram tudo).
- **Comparar recortes**: dois ciclos/praças lado a lado com a diferença calculada.
- **Fontes** da resposta + linha "não consulto a web aberta".
- **Ações da mensagem** (aparecem no hover): Copiar, Ouvir, Regenerar, útil/
  incorreta.
- **Feedback que vira aprendizado**: "Está correto?" → "Corrigir a Athena" abre
  as regras que ela vai aprender (regra de consulta, sinônimo, comportamento) e
  manda para a fila de curadoria. Estado final "Athena aprendeu, 3 regras
  aplicadas".

### 2.4 Compositor
- Campo de texto com **autocomplete de entidades do Publi** (@ para buscar
  veículo/programa cadastrado; "você quis dizer" para termos digitados errados).
- **Roda de ferramentas radial** (@ # /) e ferramentas rápidas.
- **Anexo de arquivo** (ex.: plano em xlsx que a Athena cruza com o Publi).
- **Faixa de geração**: "Consultando o Publi", pode trocar de conversa que
  continua rodando, com botão **Parar**.
- Nota de rodapé: "sempre confira o recorte no painel de proveniência".

### 2.5 Painel de Ferramentas (coluna direita)
- Aviso "Sempre confira a fonte" (bases licenciadas, não a web).
- Cartões das capacidades: Curadoria do aprendizado, Dicionário de veículos,
  Exportar dados, Proveniência da resposta, Comparar recortes, Escopo por cliente.

### 2.6 O que o backend precisa entregar (Chat)
| Funcionalidade | Requisito de backend |
|---|---|
| Resposta em streaming | `POST /chat/stream` via **SSE** (sse-starlette). Heartbeat 15s, checar `is_disconnected()`, try/finally |
| Isolar conversa (bug Caroline) | **PostgreSQL checkpointer** do LangGraph com `thread_id` real por conversa. `autocommit=True`, `row_factory=dict_row` |
| Não perder contexto (bug Victor) | State persistente (não buffer de 10 msgs). Medidor de janela de contexto vem do uso real de tokens |
| Geração em segundo plano | Task não amarrada à conexão SSE; badge de "nova resposta" por push/poll quando termina |
| Parar geração | Cancelar a task/stream do `thread_id` sob demanda |
| Proveniência + SQL | Trace da tool call (query executada, tabela, bytes, tempo). LangSmith para o trace completo |
| Autocomplete de veículos (bug nomenclatura) | Tool `validar_veiculo` + endpoint de busca no cadastro do Publi (nome canônico, CNPJ, sinônimos) |
| "Você quis dizer" | Dicionário de sinônimos (ver Admin 3.4) consultado antes de rodar a query |
| Resultado vazio inteligente (feedback Nathaly) | Nunca filtrar `status_pi = FATURADO` por padrão; incluir APROVADO e EMITIDO; excluir só CANCELADO. Ao zerar, devolver o filtro aplicado |
| Recorte geográfico (bug Stella) | Retornar a praça exata registrada no PI; nunca inferir pela campanha |
| Resultado truncado (bug Victor, Globo MA) | Sinalizar truncamento (mostrou N de M) e garantir que os totais consideram M |
| Exportação (bug Pedro) | Tool `export` (MCP) para XLSX/Sheets/CSV/PDF; agendamento recorrente (cron) |
| Anexo | Upload + parsing do arquivo e cruzamento com o Publi |
| Roteamento de modelo | Classificador de complexidade → Haiku/Sonnet/Opus; ações sensíveis param e pedem aprovação |
| Feedback → aprendizado | Persistir a correção como regra candidata na fila de curadoria (não aplica sozinha) |
| Comportamento em tempo real (Pedro) | Tool `buscar_web` melhorada para dados de comportamento quando a base não cobre |

---

## 3. Tela de ADMIN / AUDITORIA (`/admin`)

Painel do gestor. Cinco abas: **Visão geral · Aprendizado · Dicionário ·
Consultas · Usuários**. Casca igual à do chat (sidebar 260px, topbar com sombra),
fundo preto, vermelho da marca só nos acentos.

### 3.1 Visão geral
- **4 KPIs compactos** com minigráfico: Consultas no mês (4.812, ↑12%), Pessoas
  usando (48, ↑5), Voltaram vazias (9,4%, ↓2,1pp), Custo do mês (R$ 760, ↓38%).
- **9 cards de gráfico** (grade 3×3), cada um com rótulo, número herói, delta em
  pílula verde/vermelha e legenda:
  1. Consultas por dia (barras)
  2. Linhas lidas por mês (barras com rótulo no topo)
  3. Consultas sem resultado (cápsulas + linha de média da semana)
  4. Consultas por marca (barras agrupadas por dia)
  5. Volume e assertividade (coluna + linha de acerto)
  6. Custo por modelo (Haiku/Sonnet/Opus, barras)
  7. Tempo de resposta (metade/3-em-4/19-em-20/pior caso)
  8. Metas do trimestre (bullet: realizado vs meta)
  9. Sincronização das fontes (8 janelas por conector)
- **Uso por veículo** (largura total): investimento por veículo dividido por meio
  (TV, Rádio, Digital, Exterior).

### 3.2 Aprendizado (curadoria)
- 4 KPIs: Esperando aprovação (3), Regras em vigor (27), Correções no chat (41),
  Consultas salvas (312).
- **Esperando sua aprovação**: cada regra candidata mostra tipo (Regra/Sinônimo/
  Comportamento), o texto, **Antes → Depois**, quem corrigiu e o escopo. Botões
  **Aprovar para todos** / **Rejeitar**. Correção do chat NÃO vale sozinha.
- **Regras já em vigor**: lista com desde quando e quantas consultas já usaram,
  com Revogar.

### 3.3 Dicionário
- **Termos não reconhecidos**: o que o time digitou × o nome canônico do Publi,
  com nº de tentativas e botão Mapear.
- **Sinônimos já mapeados**: nome canônico + chave (CNPJ / id de cliente) + as
  grafias que caem nele.

### 3.4 Consultas (auditoria de sessões)
- **Filtros**: Todas / Úteis / Sem resultado / Corrigidas / Truncadas.
- **Tabela** de 20+ consultas: hora, pessoa, pergunta, modelo, custo, resultado.
- **Drawer de detalhe** ao clicar: tokens, tempo, linhas lidas, o **SQL** que
  rodou, fontes usadas, a resposta e como terminou. Ações "Abrir no chat" e
  "Criar regra disso".

### 3.5 Usuários
- 4 KPIs: Pessoas ativas (48), Voltam toda semana (31), Nunca usaram (12),
  Consultas por pessoa (100).
- **Quem usa a Athena**: lista com avatar, papel, consultas no mês (barra) e
  última atividade. Convidar pessoa.
- **Permissões por papel**: escolhe o papel e vê o que ele pode (consultar,
  exportar, corrigir, aprovar regra, mapear termo, ver custo, convidar).
- **Alertas por e-mail**: dispara quando vazias passam de 12%/dia, fonte fica 6h
  sem sincronizar, custo passa de R$ 1.000, regra parada 48h, 3 incorretas
  seguidas.

### 3.6 Sandbox × Produção
- Alternância de ambiente: **sandbox** roda sobre bases clonadas e nada altera as
  tabelas de produção (decisão da reunião de 10/jun; migração incremental).

### 3.7 O que o backend precisa entregar (Admin)
| Funcionalidade | Requisito de backend |
|---|---|
| KPIs e séries | Agregações de uso (consultas/dia, custo, latência p50/p95, taxa de vazias), observabilidade em BigQuery |
| Custo por modelo | Contabilizar tokens × preço por modelo, por consulta (LangSmith / tabela própria) |
| Sincronização de fontes | Status/last-sync de cada MCP do Camilo (Publi, Publi MySQL, export, mídia online) |
| Fila de curadoria | CRUD de regras candidatas; aprovar injeta no system prompt/regras; rejeitar arquiva |
| Regras em vigor | Persistência das regras aplicadas + contador de uso por regra |
| Dicionário/sinônimos | Tabela de sinônimos → nome canônico + CNPJ/id; alimenta o autocomplete do chat |
| Auditoria de sessões | Log por consulta: usuário, pergunta, modelo, custo, tokens, tempo, linhas, SQL, status |
| Permissões | RBAC por papel; endpoints protegidos por papel |
| Alertas | Regras de alerta + job que dispara e-mail (cron) |
| Sandbox | Conexão separada para bases clonadas; flag de ambiente por request |
| Convite de usuário | Fluxo de convite + marcação de primeiro acesso |

---

## 4. Arquitetura de backend (decisões e pendências)

### 4.1 Estratégia de migração, INCREMENTAL (não big bang)
O **n8n continua rodando** enquanto o Python é construído e testado em paralelo.

Fica no n8n por ora: Chat principal (agente + tools), Conversas CRUD, Histórico,
Compactação, Feedback, Auditoria, e o **Schedule Trigger / cron** (pode ficar no
n8n em definitivo, ou ir para Cloud Scheduler).

O Python faz melhor: contexto cruzado isolado (checkpointer PostgreSQL), memória
persistente, performance (async ~3× o n8n sequencial), multi-cliente (template
Jinja2), observabilidade (LangSmith), e o mapeamento de sinônimos.

Ordem: (1) construir o backend Python → (2) testar em paralelo → (3) canary 10% →
(4) switch completo com zero bug → (5) desligar n8n (ou manter só cron).

### 4.2 ALERTA, `create_react_agent` foi DEPRECADO
Em LangGraph v1.0 a API nova é `create_agent` de `langchain.agents`. O
`graph.py` migra de `create_react_agent` → `create_agent`; o system prompt sai de
parâmetro estático para **middleware** (`@dynamic_prompt`); o estado usa
`AgentState` extensível. Entender antes de migrar.

### 4.3 Stack por módulo
| Módulo | Papel | Ponto de atenção 2026 |
|---|---|---|
| **LangGraph** | Orquestra o agente (State, Node, Edge, Checkpointer, Tools, ReAct) | usar `create_agent`, não o deprecado |
| **langchain-mcp-adapters** (v0.3.0) | Transforma os 4 MCPs do Camilo em 18 tools | `tool_name_prefix=True` (evita colisão), `handle_tool_errors=True`, `tool_interceptors` p/ multi-tenant |
| **Anthropic SDK** | Protocolo de tool use por baixo do LangGraph | Extended Thinking `adaptive`, Interleaved Thinking, Prompt Caching (system 24h), Structured Output `strict` (incompatível com Extended Thinking) |
| **FastAPI + SSE** | API que o front chama | `EventSourceResponse`, heartbeat, HTTP/2, DI |
| **PostgreSQL checkpointer** | State persistente por conversa | `AsyncPostgresSaver`, `autocommit=True`, `row_factory=dict_row`, `LANGGRAPH_STRICT_MSGPACK=true`, Cloud SQL Auth Proxy |
| **BigQuery + Pydantic** | Dados e validação | client oficial; Pydantic v2 + field validators |

### 4.4 Os 4 MCPs do Camilo (18 tools)
`publi`, `publi_mysql`, `export`, `midia_online`, todos `streamable_http` com
Bearer. `tool_name_prefix=True` porque `publi` e `publi_mysql` têm tools de nome
igual (ex.: `publi_mysql__consultar_mysql`).

---

## 5. Bugs do time → o que resolve cada um

| Bug | Quem relatou | Resolvido por |
|---|---|---|
| Resposta na conversa errada | Caroline | PostgreSQL checkpointer (`thread_id`) |
| Perde contexto com muitas perguntas | Victor | State persistente (Módulo LangGraph) |
| Trava ao abrir nova conversa | Caroline | FastAPI async + geração em segundo plano |
| Nomenclatura confusa de veículos | Caroline, Victor | Dicionário de sinônimos + tool `validar_veiculo` |
| PIs não encontrados (status errado) | Nathaly | Regra: não filtrar só FATURADO (✅ no system prompt) |
| Exportação não funciona | Pedro | MCP `export` (XLSX/Sheets/CSV/PDF) |
| Comportamento em tempo real | Pedro | `buscar_web` melhorado |
| Tabela Globo incompleta / truncada | Victor | Aviso de truncamento + totais completos (investigar dados BQ) |
| Região errada (Grande Rio × RJ Estado) | Stella | Recorte geográfico exato, nunca inferir da campanha |

---

## 6. Design system (marca)

- **Cores**: preto (`#000`/`#0a0a0c`), vermelho da marca `#c41e1e` (dim `#8b1515`,
  hot `#ff4d4d`), texto `#f0ece6`/branco, apoios cinza. Tema claro espelhado.
  Sinal: verde `#5eff5a`/`#00b929`, dourado `#c9a227`. No Admin, séries em
  ciano/violeta/magenta só como apoio de gráfico.
- **Tipografia**: Inter (corpo), Montserrat (marca/títulos), JetBrains Mono
  (números e código).
- **Superfície**: cards raio 12, sombra dupla (10.67/21.33 blur 3.38 a 6,26% +
  13.48/26.97 blur 7.01 a 10,2%), separadores tracejados no Admin.
- Tokens completos em `athena-web/app/globals.css` (`:root` e `:root.light`).

---

## 7. Estado da entrega (front)

Projeto **`athena-web/`** (Next.js 15 + React 19 + TypeScript, App Router):

- `/login`, `/chat`, `/admin` portadas 1:1 dos protótipos, com tema claro/escuro
  e todos os estados interativos (abas, filtros, drawer, turnos, modal de
  exportação) funcionando com **dados mock**.
- `components/scan-effect/`, efeito WebGPU (depth-map + bloom) opcional.
- `README.md` com o mapa de rotas e a tabela de onde cada mock troca pelo backend.

**Próximo passo do time**: `npm install && npm run dev`, depois substituir os
mocks pelos endpoints da tabela de cada tela (seções 2.6, 3.7).

---

## 8. Checklist de prontidão (o que falta para operar de verdade)

- [ ] `POST /chat/stream` (SSE) ligado à bolha da Athena
- [ ] Checkpointer PostgreSQL por `thread_id` (isola conversa)
- [ ] Geração em segundo plano + badge de "nova resposta" + Parar
- [ ] Trace de proveniência (SQL, fonte, tempo, bytes) na resposta
- [ ] Endpoint de busca no cadastro do Publi (autocomplete + "você quis dizer")
- [ ] Dicionário de sinônimos alimentando chat e Admin
- [ ] Regra de status do PI aplicada por padrão (não só FATURADO)
- [ ] Recorte geográfico exato em toda resposta com dado
- [ ] Aviso de truncamento com totais completos
- [ ] MCP `export` (XLSX/Sheets/CSV/PDF) + agendamento
- [ ] Roteamento de modelo (Haiku/Sonnet/Opus) + aprovação para ação sensível
- [ ] Fila de curadoria: aprovar injeta regra, rejeitar arquiva
- [ ] RBAC por papel nos endpoints
- [ ] Alertas por e-mail (cron)
- [ ] Ambiente sandbox sobre bases clonadas
- [ ] OAuth Google restrito aos domínios + papel no login
- [ ] Migrar `create_react_agent` → `create_agent`
