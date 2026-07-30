# Patch de backend — o que falta para o front ficar 100% real

O front já está pronto para consumir estes campos. Como não consigo editar a sua
pasta montada do backend, aplique os trechos abaixo em
`agent_athena/backend/app/` (ou me mande os arquivos que eu ajusto aqui).

## 1. Mostrar a QUERY e a FONTE no resultado do chat
Decisão da reunião de 10/jun ("de onde você tirou essa informação"). Hoje o
`/chat` devolve só texto. Precisamos devolver também a consulta executada e as
fontes. O front já renderiza isso num bloco "Como cheguei nesse resultado"
(colapsável) em cada resposta — aparece sozinho quando estes campos vierem.

### models.py — adicionar à ChatResponse
```python
class ProvenanceSource(BaseModel):
    label: str            # ex.: "Publi, BigQuery"
    detail: str | None = None  # ex.: "pj_boti.pi_insercoes"

class ChatResponse(BaseModel):
    output: str
    conversation_id: str
    latency_ms: int | None = None
    attachment: Attachment | None = None
    audio: str | None = None
    sources: list[ProvenanceSource] | None = None   # NOVO
    query: str | None = None                          # NOVO (SQL executada)
    tables: list[str] | None = None                   # NOVO
```

### main.py — capturar as tool calls do agente
Depois de `result = await agent.ainvoke(...)`, antes do `return`:
```python
sources, queries, tables = [], [], []
for m in result["messages"]:
    # SQL nas chamadas de tool (BigQuery / MCP)
    for tc in (getattr(m, "tool_calls", None) or []):
        args = tc.get("args", {}) if isinstance(tc, dict) else getattr(tc, "args", {})
        sql = args.get("sql") or args.get("query")
        if sql:
            queries.append(sql)
        tbl = args.get("table") or args.get("dataset")
        if tbl:
            tables.append(tbl)
    # nome da tool executada vira fonte
    name = getattr(m, "name", None)
    if name:
        sources.append(name)

return ChatResponse(
    output=output,
    conversation_id=request.conversation_id,
    latency_ms=latency_ms,
    attachment=attachment,
    audio=audio_b64,
    query="\n\n".join(dict.fromkeys(queries)) or None,
    tables=list(dict.fromkeys(tables)) or None,
    sources=[ProvenanceSource(label=s) for s in dict.fromkeys(sources)] or None,
)
```
> Ajuste `args.get("sql")` ao nome real do parâmetro das suas tools BigQuery/MCP.
> Se preferir mapear tabela para rótulo amigável (Publi, Kantar, Tabela Jove),
> monte um dict `TABELA_FONTE` e traduza aqui — resolve o item "clareza da fonte".

## 2. Cliente (multi-tenant) — decisão da reunião
O front manda `client` no corpo do `/chat`. Aceite e use no system prompt (o
`prompts.py` já é Jinja2 por cliente):
```python
class ChatRequest(BaseModel):
    ...
    client: str | None = None   # NOVO: "O Boticário" | "Eudora" | ... | "Todos"
```
No `/chat`, passe `request.client` para o render do system prompt / config do
agente (COD_CLIENT por marca, conforme o Andrei for definindo). Hoje o Pydantic
ignora o campo extra, então nada quebra até você usá-lo.

## 3. Itens de backend levantados no feedback/reunião (checklist)
- [ ] Isolar conversa por `thread_id` (checkpointer PostgreSQL) — bug Caroline.
- [ ] `status_pi` não filtrar só FATURADO por padrão — bug Nathaly/Caroline.
- [ ] Recorte geográfico exato (Grande Rio x RJ Estado) no prompt — bug Stella.
- [ ] Aviso de truncamento quando a consulta passa do limite — bug Victor (Globo MA).
- [ ] Dicionário de sinônimos (endpoint de busca de veículo/programa) — alimenta o
      autocomplete do chat e o item "meio dia parana" — Caroline/Victor.
- [ ] `/export` real (CSV/PDF via MCP) — Pedro.
- [ ] Endpoints de auditoria extra p/ o Admin: custo por modelo, latência,
      taxa de sem-resultado (de `athena_logs`), saúde dos MCPs, e o dicionário
      (`athena_learnings`). O front já reserva o espaço e avisa que dependem disso.
- [ ] CORS: trocar `allow_origins=["*"]` pela URL do front.
- [ ] Nunca subir com `DEBUG=true` (o middleware de auth aceita tudo em debug).

## 4. Correcoes de PROMPT (app/agent/prompts.py) - fecham 3 bugs, seguras
Sao so texto no system prompt. Aplique as 3 substituicoes exatas:

### 4.1 Status do PI (bugs Nathaly e Caroline: "nao puxou / so faturado")
Troque a linha em "=== REGRAS DE NEGOCIO E SQL ===":
- DE:
  `- PIs (pi01): a coluna de SITUACAO deve SEMPRE ser considerada. Por padrao filtre faturados (SITUACAO = 'F'); se o usuario quiser outro status, pergunte/ajuste. Exponha o valor cru de status quando o significado nao for conhecido.`
- PARA:
  `- PIs (pi01): por padrao considere TODOS os status EXCETO cancelado. NAO filtre so SITUACAO = 'F'. Exponha o status de cada PI na resposta. Filtre por um status especifico apenas se o usuario pedir.`

### 4.2 Recorte geografico (bug Stella: Grande Rio x RJ Estado)
Acrescente uma regra em "=== REGRAS DE NEGOCIO E SQL ===":
  `- RECORTE GEOGRAFICO: nunca infira a praca pelo nome da campanha. Informe exatamente o recorte registrado no dado (ex.: Grande Rio nao e o mesmo que RJ Estado). Se a praca nao constar, diga que nao consta em vez de deduzir.`

### 4.3 Citacao de fonte (decisao da reuniao 10/jun)
Acrescente em "=== COMUNICACAO ===":
  `- SEMPRE informe a fonte de cada numero: diga de qual base/tabela veio (Publi, IBOPE, Tabela Jove, TGI). O front mostra a query ao usuario.`

## 5. Itens que sao trabalho de backend (precisam do seu ambiente e teste)
Estes eu NAO consigo escrever pronto sem rodar/testar na sua infra:
- Checkpointer PostgreSQL: o `graph.py` ja aceita `AsyncPostgresSaver` quando
  `POSTGRES_URI` existe. Falta so preencher a conexao do Cloud SQL (`pg-grom`) e
  instalar `langgraph-checkpoint-postgres`. Isso liga o "isolar conversa" (bug Caroline).
- Dicionario de sinonimos (endpoint de busca de veiculo/programa) para o autocomplete.
- `/export` real via MCP export (hoje e stub).
- Endpoints extra de auditoria (custo, latencia, sem-resultado, saude MCP) a partir
  de `athena_logs`/`athena_learnings`.
Cada um desses depende de dado/infra sua e de teste. Posso escrever o codigo se
voce topar aplicar e testar, mas nao da para eu validar aqui.
