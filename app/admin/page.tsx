'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, auth, isBackendError } from '@/lib/api';
import { B, IC, css } from '@/lib/dc';
import { relativeTime, fmtNum, initials, shortName } from '@/lib/format';

const ic = (d: string, s = 15, w = 1.7) => <IC s={s} d={d} w={w} />;
const num = (v: any) => Number(v || 0);

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [light, setLight] = useState(false);
  const [backendDown, setBackendDown] = useState(false);
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState<any>(null);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [convs, setConvs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState<any>(null);
  const [drawerMsgs, setDrawerMsgs] = useState<any[] | null>(null);

  useEffect(() => { document.documentElement.classList.toggle('light', light); }, [light]);

  useEffect(() => {
    (async () => {
      try {
        const m = await auth.me();
        if (!m?.authenticated) { router.replace('/login'); return; }
        if (!m.admin) { router.replace('/chat'); return; }
        setMe(m);
      } catch { router.replace('/login'); return; }
      setChecking(false);
    })();
  }, [router]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const calls = [
      api.audit('kpis').then((r) => setKpis(r.data)),
      api.audit('top_users').then((r) => setTopUsers(r.data || [])),
      api.audit('recent_activity').then((r) => setActivity(r.data || [])),
      api.audit('recent_feedback').then((r) => setFeedback(r.data || [])),
      api.audit('all_conversations').then((r) => setConvs(r.data || [])),
    ];
    const res = await Promise.allSettled(calls);
    if (res.every((r) => r.status === 'rejected')) {
      const anyBackend = res.some((r: any) => r.status === 'rejected' && isBackendError(r.reason));
      setBackendDown(anyBackend);
    }
    setLoading(false);
  }, []);
  useEffect(() => { if (me) loadAll(); }, [me, loadAll]);

  async function openConv(c: any) {
    setDrawer(c); setDrawerMsgs(null);
    try { const r = await api.audit('conversation_messages', { conversation_id: c.conversation_id }); setDrawerMsgs(r.data || []); }
    catch { setDrawerMsgs([]); }
  }
  async function logout() { try { await auth.logout(); } catch {} router.replace('/login'); }

  if (checking) return <div style={css('display:flex; height:100vh; align-items:center; justify-content:center; background:var(--page); color:var(--fg-3); font-family:\'Inter\',sans-serif; font-size:14px')}>Carregando…</div>;

  const pos = num(kpis?.positive_count), neg = num(kpis?.negative_count);
  const totalFb = pos + neg;
  const assert = totalFb ? Math.round((pos / totalFb) * 100) : null;
  const maxUser = Math.max(1, ...topUsers.map((u) => num(u.message_count)));
  const filteredConvs = search ? convs.filter((c) => (c.title || '').toLowerCase().includes(search.toLowerCase()) || (c.user_id || '').toLowerCase().includes(search.toLowerCase())) : convs;
  const themeIcon = light ? ic('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>', 13, 2) : ic('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/>', 13, 2);

  const kpiCards = kpis ? [
    { label: 'Mensagens', value: fmtNum(kpis.total_messages), sub: 'total registrado' },
    { label: 'Conversas ativas', value: fmtNum(kpis.active_conversations), sub: 'status = active' },
    { label: 'Usuários', value: fmtNum(kpis.unique_users), sub: 'que já perguntaram' },
    { label: 'Assertividade', value: assert == null ? '-' : `${assert}%`, sub: `${fmtNum(pos)} úteis / ${fmtNum(neg)} incorretas` },
    { label: 'Feedback +', value: fmtNum(pos), sub: 'respostas marcadas úteis' },
    { label: 'Feedback -', value: fmtNum(neg), sub: 'correções recebidas' },
  ] : [];

  return (
    <div style={css('display:flex; height:100vh; min-height:640px; background:var(--page); color:var(--fg); font-family:\'Inter\',sans-serif; overflow:hidden')}>
      {/* SIDEBAR */}
      <aside style={css('width:248px; flex-shrink:0; background:var(--card); display:flex; flex-direction:column; overflow:hidden')}>
        <div style={css('height:56px; flex-shrink:0; padding:0 16px; display:flex; align-items:center; gap:10px')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/athena-logo.png" alt="Athena" style={css('width:32px; height:32px; object-fit:contain; flex-shrink:0')} />
          <div style={css('min-width:0')}>
            <div style={css('font-family:\'Montserrat\',sans-serif; font-size:15px; font-weight:700; letter-spacing:1.4px; line-height:1.1')}>ATHENA</div>
            <div style={css('font-size:9px; font-weight:700; letter-spacing:1.6px; color:var(--brand); margin-top:2px')}>AUDITORIA</div>
          </div>
        </div>
        <div style={css('flex:1; overflow-y:auto; padding:14px')}>
          <div style={css('font-family:\'JetBrains Mono\',monospace; font-size:9.5px; color:var(--fg-3); letter-spacing:.14em; text-transform:uppercase; padding:4px 4px 9px')}>Painel</div>
          <div style={css('display:flex; align-items:center; gap:11px; padding:9px 11px; border-radius:10px; font-size:13px; background:var(--sunk); color:var(--fg)')}>
            {ic('<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>')}
            <span style={css('flex:1')}>Visão geral</span>
          </div>
          <B t="a" href="/chat" c="display:flex; align-items:center; gap:11px; padding:9px 11px; margin-top:4px; border-radius:10px; font-size:13px; color:var(--fg-2); text-decoration:none" h="background:var(--sunk); color:var(--fg)">
            {ic('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>')}
            <span style={css('flex:1')}>Voltar ao chat</span>
          </B>
        </div>
        <div style={css('padding:14px; border-top:1px solid var(--line)')}>
          <div style={css('display:flex; padding:3px; border-radius:10px; background:var(--sunk); margin-bottom:13px')}>
            <B t="button" onClick={() => setLight(true)} c={`flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:7px; border:none; border-radius:8px; font-family:'Inter',sans-serif; font-size:11.5px; font-weight:600; cursor:pointer; background:${light ? 'var(--card)' : 'transparent'}; color:${light ? 'var(--fg)' : 'var(--fg-3)'}`}>Claro</B>
            <B t="button" onClick={() => setLight(false)} c={`flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:7px; border:none; border-radius:8px; font-family:'Inter',sans-serif; font-size:11.5px; font-weight:600; cursor:pointer; background:${light ? 'transparent' : 'var(--card)'}; color:${light ? 'var(--fg-3)' : 'var(--fg)'}`}>Escuro</B>
          </div>
          <div style={css('display:flex; align-items:center; gap:10px')}>
            <span style={css('width:30px; height:30px; border-radius:50%; background:linear-gradient(140deg,var(--brand-dim,#8b1515),var(--brand)); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#fff; flex-shrink:0')}>{initials(me?.name || me?.email)}</span>
            <span style={css('flex:1; min-width:0')}>
              <span style={css('display:block; font-size:12.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{me?.name}</span>
              <span style={css('display:block; font-size:10.5px; color:var(--fg-3)')}>Administrador</span>
            </span>
            <B t="button" onClick={logout} title="Sair" c="background:none; border:none; color:var(--fg-3); cursor:pointer; padding:4px; display:flex; flex-shrink:0" h="color:var(--brand)">
              {ic('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>', 15)}
            </B>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={css('flex:1; min-width:0; display:flex; flex-direction:column; overflow:hidden; background:var(--page)')}>
        <header style={css('height:56px; flex-shrink:0; display:flex; align-items:center; gap:14px; padding:0 20px 0 24px; background:var(--card); box-shadow:0 6px 18px -8px rgba(0,0,0,.75); z-index:3')}>
          <div style={css('flex:1; min-width:0; display:flex; align-items:baseline; gap:12px')}>
            <span style={css('font-size:19px; font-weight:700; letter-spacing:-.01em')}>Visão geral</span>
            <span style={css('font-size:13px; color:var(--fg-3)')}>dados reais do BigQuery de persistência</span>
          </div>
          <B t="button" onClick={loadAll} title="Atualizar" c="height:32px; padding:0 12px; border:1px solid var(--line); border-radius:9px; background:var(--card); font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--fg-2); cursor:pointer; display:flex; align-items:center; gap:7px" h="color:var(--fg)">
            {ic('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>', 12, 2)} Atualizar
          </B>
          <B t="button" onClick={() => setLight((v) => !v)} title="Tema" c="width:32px; height:32px; padding:0; border:1px solid var(--line); border-radius:9px; background:var(--card); color:var(--fg-2); cursor:pointer; display:flex; align-items:center; justify-content:center" h="color:var(--fg)">{themeIcon}</B>
        </header>

        <div style={css('flex:1; overflow-y:auto; overflow-x:hidden; padding:20px 24px 36px')}>
          {backendDown ? (
            <div style={css('max-width:560px; margin:8vh auto 0; text-align:center; display:flex; flex-direction:column; align-items:center; gap:14px')}>
              <span style={css('width:52px; height:52px; border-radius:14px; background:rgba(201,162,39,.1); border:1px solid rgba(201,162,39,.3); display:flex; align-items:center; justify-content:center')}>{ic('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', 22, 1.8)}</span>
              <div style={css('font-size:16px; font-weight:700')}>Backend não conectado</div>
              <div style={css('font-size:13px; color:var(--fg-2); line-height:1.6')}>Defina <code style={{ fontFamily: 'monospace' }}>ATHENA_BACKEND_URL</code> e <code style={{ fontFamily: 'monospace' }}>ATHENA_BACKEND_TOKEN</code> no servidor. Este painel só mostra dados reais do endpoint <code style={{ fontFamily: 'monospace' }}>/audit</code>, nada é fabricado.</div>
            </div>
          ) : (
            <div style={css('display:flex; flex-direction:column; gap:16px')}>
              {loading && <div style={css('font-size:12px; color:var(--fg-3)')}>Carregando dados…</div>}

              {/* KPIs */}
              <div style={css('display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:14px')}>
                {kpiCards.map((k, i) => (
                  <div key={i} style={css('background:var(--card); border:1px solid var(--line); border-radius:12px; padding:18px 20px; box-shadow:var(--shadow); min-width:0')}>
                    <div style={css('font-size:11px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--fg-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{k.label}</div>
                    <div style={css('font-family:\'JetBrains Mono\',monospace; font-size:26px; font-weight:700; letter-spacing:-.02em; margin-top:8px')}>{k.value}</div>
                    <div style={css('font-size:10.5px; color:var(--fg-3); margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{k.sub}</div>
                  </div>
                ))}
                {!kpis && !loading && <div style={css('font-size:12px; color:var(--fg-3)')}>Sem dados de KPIs.</div>}
              </div>

              <div style={css('display:grid; grid-template-columns:repeat(auto-fit, minmax(340px,1fr)); gap:16px; align-items:start')}>
                {/* Assertividade (derivada de feedback real) */}
                <div style={css('background:var(--card); border:1px solid var(--line); border-radius:12px; padding:22px; box-shadow:var(--shadow); min-width:0')}>
                  <div style={css('font-size:15px; font-weight:700')}>Assertividade</div>
                  <div style={css('font-size:11px; color:var(--fg-3); margin-top:4px')}>calculada do feedback real (👍 / 👎)</div>
                  {totalFb === 0 ? (
                    <div style={css('font-size:13px; color:var(--fg-3); padding:24px 0')}>Ainda não há feedback registrado.</div>
                  ) : (
                    <div style={css('display:flex; align-items:center; gap:22px; margin-top:16px')}>
                      <div style={css('position:relative; width:120px; height:120px; flex-shrink:0')}>
                        <svg viewBox="0 0 120 120" style={css('width:100%; height:100%; transform:rotate(-90deg)')}>
                          <circle cx="60" cy="60" r="48" fill="none" stroke="var(--sunk)" strokeWidth="16" />
                          <circle cx="60" cy="60" r="48" fill="none" stroke="var(--brand)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(assert || 0) / 100 * 301.6} 301.6`} />
                        </svg>
                        <div style={css('position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-family:\'JetBrains Mono\',monospace; font-size:22px; font-weight:700')}>{assert}%</div>
                      </div>
                      <div style={css('flex:1; min-width:0; display:flex; flex-direction:column; gap:12px')}>
                        <div><div style={css('display:flex; justify-content:space-between; font-size:12.5px')}><span style={css('color:var(--fg-2)')}>Úteis</span><span style={css('font-family:\'JetBrains Mono\',monospace; font-weight:700; color:var(--green)')}>{fmtNum(pos)}</span></div><div style={css('height:6px; border-radius:3px; background:var(--sunk); margin-top:6px; overflow:hidden')}><div style={css(`height:100%; background:var(--green); width:${Math.round(pos / totalFb * 100)}%`)} /></div></div>
                        <div><div style={css('display:flex; justify-content:space-between; font-size:12.5px')}><span style={css('color:var(--fg-2)')}>Incorretas</span><span style={css('font-family:\'JetBrains Mono\',monospace; font-weight:700; color:var(--red)')}>{fmtNum(neg)}</span></div><div style={css('height:6px; border-radius:3px; background:var(--sunk); margin-top:6px; overflow:hidden')}><div style={css(`height:100%; background:var(--red); width:${Math.round(neg / totalFb * 100)}%`)} /></div></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Top usuários (real) */}
                <div style={css('background:var(--card); border:1px solid var(--line); border-radius:12px; padding:22px; box-shadow:var(--shadow); min-width:0')}>
                  <div style={css('font-size:15px; font-weight:700')}>Top usuários</div>
                  <div style={css('font-size:11px; color:var(--fg-3); margin-top:4px')}>por mensagens enviadas</div>
                  <div style={css('display:flex; flex-direction:column; gap:11px; margin-top:16px')}>
                    {topUsers.length === 0 && !loading && <div style={css('font-size:12px; color:var(--fg-3)')}>Sem dados.</div>}
                    {topUsers.map((u, i) => (
                      <div key={i} style={css('display:flex; align-items:center; gap:11px')}>
                        <span style={css('font-size:12px; color:var(--fg-2); width:130px; flex-shrink:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{shortName(u.user_id)}</span>
                        <span style={css('flex:1; min-width:0; height:9px; border-radius:5px; background:var(--sunk); overflow:hidden')}><span style={css(`display:block; height:100%; border-radius:5px; background:var(--brand); width:${Math.round(num(u.message_count) / maxUser * 100)}%`)} /></span>
                        <span style={css('font-family:\'JetBrains Mono\',monospace; font-size:11.5px; width:42px; text-align:right; flex-shrink:0')}>{fmtNum(u.message_count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={css('display:grid; grid-template-columns:repeat(auto-fit, minmax(340px,1fr)); gap:16px; align-items:start')}>
                {/* Atividade recente (real 24h) */}
                <div style={css('background:var(--card); border:1px solid var(--line); border-radius:12px; padding:22px; box-shadow:var(--shadow); min-width:0')}>
                  <div style={css('font-size:15px; font-weight:700')}>Atividade recente</div>
                  <div style={css('font-size:11px; color:var(--fg-3); margin-top:4px')}>perguntas das últimas 24h</div>
                  <div style={css('display:flex; flex-direction:column; margin-top:12px; max-height:320px; overflow-y:auto')}>
                    {activity.length === 0 && !loading && <div style={css('font-size:12px; color:var(--fg-3); padding:10px 0')}>Nada nas últimas 24h.</div>}
                    {activity.map((a, i) => (
                      <div key={i} style={css('display:flex; gap:11px; padding:11px 0; border-top:1px dashed var(--dash)')}>
                        <span style={css('width:26px; height:26px; border-radius:50%; background:var(--sunk); display:flex; align-items:center; justify-content:center; font-size:9.5px; font-weight:700; color:var(--fg-2); flex-shrink:0')}>{initials(a.user_id)}</span>
                        <div style={css('flex:1; min-width:0')}>
                          <div style={css('font-size:12.5px; color:var(--fg); line-height:1.5; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical')}>{a.content}</div>
                          <div style={css('font-size:10.5px; color:var(--fg-3); margin-top:3px')}>{shortName(a.user_id)} · {relativeTime(a.timestamp)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feedback recente (real), negativos = candidatos a curadoria */}
                <div style={css('background:var(--card); border:1px solid var(--line); border-radius:12px; padding:22px; box-shadow:var(--shadow); min-width:0')}>
                  <div style={css('font-size:15px; font-weight:700')}>Feedback recente</div>
                  <div style={css('font-size:11px; color:var(--fg-3); margin-top:4px')}>correções (👎) viram aprendizado na análise semanal</div>
                  <div style={css('display:flex; flex-direction:column; margin-top:12px; max-height:320px; overflow-y:auto')}>
                    {feedback.length === 0 && !loading && <div style={css('font-size:12px; color:var(--fg-3); padding:10px 0')}>Nenhum feedback ainda.</div>}
                    {feedback.map((f, i) => {
                      const negativo = f.rating === 'negative';
                      return (
                        <div key={i} style={css('display:flex; gap:11px; padding:11px 0; border-top:1px dashed var(--dash)')}>
                          <span style={css(`width:22px; height:22px; border-radius:6px; flex-shrink:0; display:flex; align-items:center; justify-content:center; background:${negativo ? 'rgba(196,30,30,.14)' : 'rgba(94,255,90,.12)'}`)}>{ic(negativo ? '<path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/>' : '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>', 12, 2)}</span>
                          <div style={css('flex:1; min-width:0')}>
                            <div style={css('font-size:12.5px; color:var(--fg); line-height:1.5')}>{f.user_query || '(sem pergunta registrada)'}</div>
                            {f.comment && <div style={css(`font-size:11.5px; color:${negativo ? 'var(--red)' : 'var(--fg-2)'}; margin-top:4px; line-height:1.5`)}>“{f.comment}”</div>}
                            <div style={css('font-size:10.5px; color:var(--fg-3); margin-top:3px')}>{shortName(f.user_id)} · {relativeTime(f.timestamp)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Conversas (real) */}
              <div style={css('background:var(--card); border:1px solid var(--line); border-radius:12px; padding:22px; box-shadow:var(--shadow); min-width:0')}>
                <div style={css('display:flex; align-items:center; gap:12px; flex-wrap:wrap')}>
                  <div style={css('min-width:0; flex:1')}>
                    <div style={css('font-size:15px; font-weight:700')}>Todas as conversas</div>
                    <div style={css('font-size:11px; color:var(--fg-3); margin-top:4px')}>clique para ver as mensagens</div>
                  </div>
                  <div style={css('display:flex; align-items:center; gap:8px; padding:7px 11px; background:var(--sunk); border-radius:8px')}>
                    <IC s={13} d='<circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.5" y2="16.5"/>' w={2} stroke="var(--fg-3)" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar por título ou usuário" style={css('background:transparent; border:none; outline:none; color:var(--fg); font-family:\'Inter\',sans-serif; font-size:12.5px; width:200px; max-width:50vw')} />
                  </div>
                </div>
                <div style={css('overflow-x:auto; margin-top:16px')}>
                  <table style={css('width:100%; border-collapse:collapse')}>
                    <thead><tr>{['Conversa', 'Usuário', 'Mensagens', 'Criada', 'Atualizada'].map((h, i) => <th key={i} style={css(`text-align:${i >= 2 ? 'right' : 'left'}; padding:9px 12px 9px 0; font-family:'JetBrains Mono',monospace; font-size:9px; color:var(--fg-3); letter-spacing:.12em; text-transform:uppercase; font-weight:700; white-space:nowrap; border-bottom:1px dashed var(--dash)`)}>{h}</th>)}</tr></thead>
                    <tbody>
                      {filteredConvs.length === 0 && !loading && <tr><td colSpan={5} style={css('padding:16px 0; font-size:12px; color:var(--fg-3)')}>Nenhuma conversa.</td></tr>}
                      {filteredConvs.map((c, i) => (
                        <B key={i} t="tr" onClick={() => openConv(c)} c="cursor:pointer" h="background:var(--sunk)">
                          <td style={css('padding:12px 12px 12px 0; font-size:12.5px; font-weight:600; max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; border-bottom:1px dashed var(--dash)')}>{c.title || 'Sem título'}</td>
                          <td style={css('padding:12px 12px 12px 0; font-size:12.5px; color:var(--fg-2); white-space:nowrap; border-bottom:1px dashed var(--dash)')}>{shortName(c.user_id)}</td>
                          <td style={css('padding:12px 12px 12px 0; text-align:right; font-family:\'JetBrains Mono\',monospace; font-size:11.5px; border-bottom:1px dashed var(--dash)')}>{fmtNum(c.message_count)}</td>
                          <td style={css('padding:12px 12px 12px 0; text-align:right; font-family:\'JetBrains Mono\',monospace; font-size:11px; color:var(--fg-3); white-space:nowrap; border-bottom:1px dashed var(--dash)')}>{relativeTime(c.created_at)}</td>
                          <td style={css('padding:12px 0; text-align:right; font-family:\'JetBrains Mono\',monospace; font-size:11px; color:var(--fg-3); white-space:nowrap; border-bottom:1px dashed var(--dash)')}>{relativeTime(c.updated_at)}</td>
                        </B>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Métricas que dependem de novos endpoints (honesto) */}
              <div style={css('background:var(--card); border:1px dashed var(--line); border-radius:12px; padding:18px 22px; min-width:0')}>
                <div style={css('font-size:12.5px; font-weight:700; color:var(--fg-2)')}>Métricas que ainda dependem do backend</div>
                <div style={css('font-size:11.5px; color:var(--fg-3); margin-top:6px; line-height:1.6')}>Custo por modelo, latência, taxa de consultas sem resultado, saúde das fontes MCP e o dicionário de termos <strong style={{ color: 'var(--fg-2)' }}>não</strong> são expostos hoje pelo endpoint <code style={{ fontFamily: 'monospace' }}>/audit</code>. Quando o backend adicionar essas consultas (ex.: a partir de <code style={{ fontFamily: 'monospace' }}>athena_logs</code> e <code style={{ fontFamily: 'monospace' }}>athena_learnings</code>), elas entram aqui com dados reais. Detalhe em INTEGRACAO.md.</div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* DRAWER */}
      {drawer && (
        <div onClick={() => setDrawer(null)} style={css('position:fixed; inset:0; z-index:90; background:rgba(0,0,0,.7); display:flex; justify-content:flex-end')}>
          <div onClick={(e) => e.stopPropagation()} style={css('width:560px; max-width:100%; height:100%; background:var(--card); border-left:1px solid var(--line); display:flex; flex-direction:column; overflow:hidden')}>
            <div style={css('display:flex; align-items:flex-start; gap:12px; padding:22px 24px 18px; border-bottom:1px dashed var(--dash); flex-shrink:0')}>
              <div style={css('min-width:0; flex:1')}>
                <div style={css('font-size:15px; font-weight:700; line-height:1.4')}>{drawer.title || 'Conversa'}</div>
                <div style={css('font-size:11.5px; color:var(--fg-3); margin-top:6px')}>{shortName(drawer.user_id)} · {fmtNum(drawer.message_count)} mensagens · {relativeTime(drawer.updated_at)}</div>
              </div>
              <B t="button" onClick={() => setDrawer(null)} title="Fechar" c="background:none; border:none; color:var(--fg-3); cursor:pointer; padding:4px; display:flex; flex-shrink:0" h="color:var(--fg)"><IC s={17} d='<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' w={2} /></B>
            </div>
            <div style={css('flex:1; overflow-y:auto; padding:20px 24px 32px; display:flex; flex-direction:column; gap:14px')}>
              {drawerMsgs === null && <div style={css('font-size:12px; color:var(--fg-3)')}>Carregando mensagens…</div>}
              {drawerMsgs?.length === 0 && <div style={css('font-size:12px; color:var(--fg-3)')}>Sem mensagens.</div>}
              {(drawerMsgs || []).filter((m) => m.role !== 'system_summary').map((m, i) => (
                <div key={i} style={css(`display:flex; flex-direction:column; gap:5px; ${m.role === 'user' ? 'align-items:flex-end' : ''}`)}>
                  <span style={css(`font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:.1em; text-transform:uppercase; color:${m.role === 'user' ? 'var(--fg-3)' : 'var(--brand)'}`)}>{m.role === 'user' ? 'Usuário' : 'Athena'}</span>
                  <div style={css(`max-width:92%; font-size:12.5px; line-height:1.6; padding:10px 13px; border-radius:10px; white-space:pre-wrap; background:${m.role === 'user' ? 'var(--sunk)' : 'transparent'}; border:1px solid var(--line); color:var(--fg)`)}>{m.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
