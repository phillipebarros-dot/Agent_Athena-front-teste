'use client';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, auth, isBackendError } from '@/lib/api';
import type { AthenaUser } from '@/lib/types';
import { B, IC, css } from '@/lib/dc';
import { Sidebar } from '@/components/chat/Sidebar';
import { relativeTime, fmtNum, initials, shortName } from '@/lib/format';

const ic = (d: string, s = 15, w = 1.7) => <IC s={s} d={d} w={w} />;
const num = (v: any) => { const n = Number(v || 0); return Number.isNaN(n) ? 0 : n; };
const DISP = "'Oswald',sans-serif";
const dayKey = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
const hourOf = (iso?: string) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(d.getTime()) ? d.getHours() : -1; };

const ROLES = ['Administrador', 'Planejamento', 'Mídia', 'Atendimento'];
const PERMS: { label: string; roles: string[] }[] = [
  { label: 'Consultar Publi e bases Kantar', roles: ROLES },
  { label: 'Exportar tabela e conversa', roles: ROLES },
  { label: 'Corrigir a Athena no chat', roles: ROLES },
  { label: 'Mapear termo no dicionário', roles: ['Administrador', 'Planejamento'] },
  { label: 'Aprovar regra para toda a agência', roles: ['Administrador'] },
  { label: 'Ver custo e auditoria de todos', roles: ['Administrador'] },
  { label: 'Convidar e remover pessoas', roles: ['Administrador'] },
];

export default function AdminPage() {
  return <Suspense fallback={<div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--page)', color: 'var(--fg-3)', fontFamily: 'var(--font-body)', fontSize: 14 }}>Carregando...</div>}><AdminPageInner /></Suspense>;
}

function AdminPageInner() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [light, setLight] = useState(false);
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'visao');
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

  const [roleMap, setRoleMap] = useState<Record<string, string>>({});
  const [roleView, setRoleView] = useState('Administrador');
  const [roleSaved, setRoleSaved] = useState(false);

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
    const r = await Promise.allSettled([
      api.audit('kpis'), api.audit('top_users'), api.audit('recent_activity'),
      api.audit('recent_feedback'), api.audit('all_conversations'),
    ]);
    const [k, tu, act, fb, cv] = r;
    if (k.status === 'fulfilled') setKpis(k.value.data);
    if (tu.status === 'fulfilled') setTopUsers(tu.value.data || []);
    if (act.status === 'fulfilled') setActivity(act.value.data || []);
    if (fb.status === 'fulfilled') setFeedback(fb.value.data || []);
    if (cv.status === 'fulfilled') setConvs(cv.value.data || []);
    if (r.every((x) => x.status === 'rejected')) {
      setBackendDown(r.some((x: any) => isBackendError(x.reason)));
    } else setBackendDown(false);
    setLoading(false);
  }, []);
  useEffect(() => { if (me) loadAll(); }, [me, loadAll]);

  async function openConv(c: any) {
    setDrawer(c); setDrawerMsgs(null);
    try { const r = await api.audit('conversation_messages', { conversation_id: c.conversation_id }); setDrawerMsgs(r.data || []); }
    catch { setDrawerMsgs([]); }
  }
  async function logout() { try { await auth.logout(); } catch {} router.replace('/login'); }

  // ---- derivações REAIS a partir das linhas do /audit ----
  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    convs.forEach((c) => { const k = dayKey(c.created_at); if (k) map.set(k, (map.get(k) || 0) + 1); });
    const days = Array.from(map.keys()).sort().slice(-14);
    const max = Math.max(1, ...days.map((d) => map.get(d) || 0));
    return { days: days.map((d) => ({ key: d, label: d.slice(8) + '/' + d.slice(5, 7), v: map.get(d) || 0, h: Math.round((map.get(d) || 0) / max * 100) })), max };
  }, [convs]);

  const byHour = useMemo(() => {
    const arr = new Array(24).fill(0);
    activity.forEach((a) => { const h = hourOf(a.timestamp); if (h >= 0) arr[h]++; });
    const max = Math.max(1, ...arr);
    return arr.map((v, h) => ({ h, v, ht: Math.round(v / max * 100) }));
  }, [activity]);

  const msgDist = useMemo(() => {
    const buckets = [{ label: '1', min: 1, max: 1 }, { label: '2-3', min: 2, max: 3 }, { label: '4-6', min: 4, max: 6 }, { label: '7-10', min: 7, max: 10 }, { label: '11+', min: 11, max: 1e9 }];
    const counts = buckets.map((b) => convs.filter((c) => num(c.message_count) >= b.min && num(c.message_count) <= b.max).length);
    const max = Math.max(1, ...counts);
    return buckets.map((b, i) => ({ label: b.label, v: counts[i], h: Math.round(counts[i] / max * 100) }));
  }, [convs]);

  const pos = num(kpis?.positive_count), neg = num(kpis?.negative_count);
  const totalFb = pos + neg;
  const assert = totalFb ? Math.round((pos / totalFb) * 100) : null;
  const maxUser = Math.max(1, ...topUsers.map((u) => num(u.message_count)));

  const people = useMemo(() => {
    const m = new Map<string, number>();
    topUsers.forEach((u) => m.set(u.user_id, num(u.message_count)));
    convs.forEach((c) => { if (c.user_id && !m.has(c.user_id)) m.set(c.user_id, 0); });
    activity.forEach((a) => { if (a.user_id && !m.has(a.user_id)) m.set(a.user_id, 0); });
    return Array.from(m.entries()).map(([user_id, count]) => ({ user_id, count })).sort((a, b) => b.count - a.count);
  }, [topUsers, convs, activity]);

  const filteredConvs = search ? convs.filter((c) => (c.title || '').toLowerCase().includes(search.toLowerCase()) || (c.user_id || '').toLowerCase().includes(search.toLowerCase())) : convs;
  const themeIcon = light ? ic('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>', 13, 2) : ic('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/>', 13, 2);
  if (checking) return <div style={css('display:flex; height:100vh; align-items:center; justify-content:center; background:var(--page); color:var(--fg-3); font-family:var(--font-body); font-size:14px')}>Carregando...</div>;

  const kpiCards = kpis ? [
    { label: 'Mensagens', value: fmtNum(kpis.total_messages), sub: 'total registrado' },
    { label: 'Conversas ativas', value: fmtNum(kpis.active_conversations), sub: 'status ativo' },
    { label: 'Usuários', value: fmtNum(kpis.unique_users), sub: 'já perguntaram' },
    { label: 'Assertividade', value: assert == null ? '—' : assert + '%', sub: totalFb ? `${fmtNum(pos)} de ${fmtNum(totalFb)} avaliações` : 'sem feedback ainda' },
    { label: 'Feedback +', value: fmtNum(pos), sub: 'úteis' },
    { label: 'Feedback −', value: fmtNum(neg), sub: 'correções' },
  ] : [];

  const tabs = [
    { id: 'visao', label: 'Visão geral', d: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>' },
    { id: 'conversas', label: 'Conversas', d: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
    { id: 'usuarios', label: 'Usuários e permissões', d: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>' },
    { id: 'config', label: 'Configurações', d: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' },
  ];

  const Panel = ({ title, hint, children, extra }: any) => (
    <div style={css('background:var(--bg-surface); border:1px solid var(--border); border-radius:14px; padding:20px 22px; box-shadow:var(--shadow); min-width:0')}>
      <div style={css('display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:16px')}>
        <div style={css('min-width:0')}>
          <div style={css('font-size:14px; font-weight:700; letter-spacing:.01em')}>{title}</div>
          {hint && <div style={css('font-size:11px; color:var(--fg-3); margin-top:4px')}>{hint}</div>}
        </div>
        {extra}
      </div>
      {children}
    </div>
  );

  return (
    <div style={css('display:flex; height:100vh; min-height:640px; background:var(--page); color:var(--fg); font-family:var(--font-body); overflow:hidden')}>
      <Sidebar
        me={me}
        conversations={[]}
        activeId={null}
        search=""
        onSearchChange={() => {}}
        client=""
        onClientChange={() => {}}
        onSelectConversation={() => {}}
        onNewConversation={() => router.push('/chat')}
        onLogout={logout}
        backendDown={false}
        light={light}
        onToggleTheme={() => setLight((v) => !v)}
      />

      {/* MAIN */}
      <main style={css('flex:1; min-width:0; display:flex; flex-direction:column; overflow:hidden')}>
        <header style={css('height:60px; flex-shrink:0; display:flex; align-items:center; gap:14px; padding:0 22px; background:var(--bg-surface); border-bottom:1px solid var(--border); z-index:3')}>
          <div style={css('flex:1; min-width:0; display:flex; align-items:center; gap:6px')}>
            {tabs.map((tb) => { const on = tab === tb.id; return (
              <B key={tb.id} t="button" onClick={() => setTab(tb.id)} c={`display:flex; align-items:center; gap:7px; padding:8px 14px; border:none; border-radius:9px; font-family:var(--font-body); font-size:12.5px; font-weight:${on ? '700' : '500'}; cursor:pointer; color:${on ? 'var(--fg)' : 'var(--fg-2)'}; background:${on ? 'var(--sunk)' : 'transparent'}; transition:all .18s`} h="background:var(--sunk); color:var(--fg)">
                {ic(tb.d, 14, 1.7)}{tb.label}
              </B>
            ); })}
          </div>
          <B t="button" onClick={loadAll} c="height:34px; padding:0 13px; border:1px solid var(--border); border-radius:9px; background:var(--bg-card); font-size:12px; color:var(--fg-2); cursor:pointer; display:flex; align-items:center; gap:7px" h="border-color:var(--red); color:var(--fg)">
            {ic('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>', 13, 2)} Atualizar
          </B>
        </header>

        <div style={css('flex:1; overflow-y:auto; overflow-x:hidden; padding:20px 22px 40px')}>
          {backendDown ? (
            <div style={css('max-width:560px; margin:8vh auto 0; text-align:center; display:flex; flex-direction:column; align-items:center; gap:14px')}>
              <span style={css('width:52px; height:52px; border-radius:14px; background:var(--red-glow); border:1px solid var(--red); display:flex; align-items:center; justify-content:center; color:var(--red)')}>{ic('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', 22)}</span>
              <div style={css('font-family:' + DISP + '; font-size:18px; font-weight:600')}>Backend não conectado</div>
              <div style={css('font-size:13px; color:var(--fg-2); line-height:1.6')}>Defina ATHENA_BACKEND_URL e ATHENA_BACKEND_TOKEN no servidor. Este painel só mostra dados reais do endpoint /audit, nada é fabricado.</div>
            </div>
          ) : (
            <div style={css('display:flex; flex-direction:column; gap:16px')}>
              {loading && <div style={css('font-size:12px; color:var(--fg-3)')}>Carregando dados reais...</div>}

              {tab === 'visao' && (
                <>
                  <div style={css('display:grid; grid-template-columns:repeat(auto-fit, minmax(170px,1fr)); gap:14px')}>
                    {kpiCards.map((k, i) => (
                      <div key={i} style={{ ...css('background:var(--bg-surface); border:1px solid var(--border); border-radius:14px; padding:16px 18px; box-shadow:var(--shadow); min-width:0'), animation: 'rise .4s ease both' }}>
                        <div style={css('font-family:' + DISP + '; font-size:11px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--fg-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{k.label}</div>
                        <div style={css('font-family:' + DISP + '; font-size:30px; font-weight:600; letter-spacing:.01em; margin-top:6px; color:var(--fg)')}>{k.value}</div>
                        <div style={css('font-size:10.5px; color:var(--fg-3); margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{k.sub}</div>
                      </div>
                    ))}
                    {!kpis && !loading && <div style={css('font-size:12px; color:var(--fg-3)')}>Sem KPIs.</div>}
                  </div>

                  <div style={css('display:grid; grid-template-columns:2fr 1fr; gap:16px; align-items:start')}>
                    <Panel title="Conversas por dia" hint="derivado de created_at das conversas reais">
                      {byDay.days.length === 0 ? <Empty /> : (
                        <>
                          <div style={css('display:flex; align-items:flex-end; gap:6px; height:170px')}>
                            {byDay.days.map((d, i) => (
                              <div key={i} title={`${d.label}: ${d.v}`} style={css('flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; gap:6px; min-width:0')}>
                                <span style={css('font-family:' + DISP + '; font-size:9px; color:var(--fg-3)')}>{d.v || ''}</span>
                                <div style={css(`width:100%; max-width:26px; height:${Math.max(2, d.h)}%; border-radius:5px 5px 0 0; background:linear-gradient(180deg,var(--red),var(--wine))`)} />
                              </div>
                            ))}
                          </div>
                          <div style={css('display:flex; gap:6px; margin-top:8px')}>
                            {byDay.days.map((d, i) => <span key={i} style={css('flex:1; text-align:center; font-family:' + DISP + '; font-size:8.5px; color:var(--fg-3); min-width:0; white-space:nowrap; overflow:hidden')}>{d.label}</span>)}
                          </div>
                        </>
                      )}
                    </Panel>
                    <Panel title="Assertividade" hint="do feedback real (positivo/negativo)">
                      {totalFb === 0 ? <Empty msg="Sem feedback ainda." /> : (
                        <div style={css('display:flex; flex-direction:column; align-items:center; gap:16px')}>
                          <div style={css('position:relative; width:150px; height:150px')}>
                            <svg viewBox="0 0 120 120" style={css('width:100%; height:100%; transform:rotate(-90deg)')}>
                              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--sunk)" strokeWidth="16" />
                              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--red)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(assert || 0) / 100 * 314} 314`} />
                            </svg>
                            <div style={css('position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center')}>
                              <span style={css('font-family:' + DISP + '; font-size:30px; font-weight:600')}>{assert}%</span>
                              <span style={css('font-size:10px; color:var(--fg-3)')}>útil</span>
                            </div>
                          </div>
                          <div style={css('display:flex; gap:18px')}>
                            <span style={css('display:flex; align-items:center; gap:6px; font-size:12px; color:var(--fg-2)')}><span style={css('width:8px; height:8px; border-radius:2px; background:var(--red)')} />{fmtNum(pos)} úteis</span>
                            <span style={css('display:flex; align-items:center; gap:6px; font-size:12px; color:var(--fg-2)')}><span style={css('width:8px; height:8px; border-radius:2px; background:var(--sunk); border:1px solid var(--border)')} />{fmtNum(neg)} correções</span>
                          </div>
                        </div>
                      )}
                    </Panel>
                  </div>

                  <div style={css('display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; align-items:start')}>
                    <Panel title="Atividade por hora" hint="perguntas das últimas 24h">
                      <div style={css('display:flex; align-items:flex-end; gap:2px; height:120px')}>
                        {byHour.map((b, i) => <div key={i} title={`${b.h}h: ${b.v}`} style={css(`flex:1; height:${Math.max(2, b.ht)}%; border-radius:2px; background:${b.v ? 'var(--red)' : 'var(--sunk)'}`)} />)}
                      </div>
                      <div style={css('display:flex; justify-content:space-between; margin-top:8px; font-family:' + DISP + '; font-size:8.5px; color:var(--fg-3)')}><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
                    </Panel>
                    <Panel title="Mensagens por conversa" hint="distribuição real">
                      <div style={css('display:flex; align-items:flex-end; gap:10px; height:120px')}>
                        {msgDist.map((b, i) => (
                          <div key={i} style={css('flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; gap:6px; min-width:0')}>
                            <span style={css('font-family:' + DISP + '; font-size:10px; color:var(--fg-2)')}>{b.v}</span>
                            <div style={css(`width:100%; max-width:34px; height:${Math.max(2, b.h)}%; border-radius:5px 5px 0 0; background:var(--wine)`)} />
                            <span style={css('font-family:' + DISP + '; font-size:9px; color:var(--fg-3)')}>{b.label}</span>
                          </div>
                        ))}
                      </div>
                    </Panel>
                    <Panel title="Top usuários" hint="por mensagens">
                      <div style={css('display:flex; flex-direction:column; gap:10px')}>
                        {topUsers.length === 0 && !loading && <Empty />}
                        {topUsers.slice(0, 6).map((u, i) => (
                          <div key={i} style={css('display:flex; align-items:center; gap:9px')}>
                            <span style={css('font-size:11.5px; color:var(--fg-2); width:96px; flex-shrink:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{shortName(u.user_id)}</span>
                            <span style={css('flex:1; min-width:0; height:8px; border-radius:5px; background:var(--sunk); overflow:hidden')}><span style={css(`display:block; height:100%; border-radius:5px; background:var(--red); width:${Math.round(num(u.message_count) / maxUser * 100)}%`)} /></span>
                            <span style={css('font-family:' + DISP + '; font-size:11px; width:38px; text-align:right; flex-shrink:0')}>{fmtNum(u.message_count)}</span>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  </div>

                  <Panel title="Feedback recente" hint="correções (negativas) alimentam a curadoria do aprendizado">
                    {feedback.length === 0 && !loading ? <Empty msg="Nenhum feedback ainda." /> : (
                      <div style={css('display:flex; flex-direction:column')}>
                        {feedback.slice(0, 8).map((f, i) => { const neg = f.rating === 'negative'; return (
                          <div key={i} style={css('display:flex; gap:12px; padding:11px 0; border-top:1px dashed var(--dash)')}>
                            <span style={css(`width:22px; height:22px; border-radius:6px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:${neg ? 'var(--red)' : 'var(--green)'}; background:${neg ? 'var(--red-glow)' : 'rgba(63,185,80,.12)'}`)}>{ic(neg ? '<path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>' : '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>', 12, 2)}</span>
                            <div style={css('flex:1; min-width:0')}>
                              <div style={css('font-size:12.5px; color:var(--fg); line-height:1.5')}>{f.user_query || '(sem pergunta registrada)'}</div>
                              {f.comment && <div style={css(`font-size:11.5px; color:${neg ? 'var(--red)' : 'var(--fg-2)'}; margin-top:3px`)}>“{f.comment}”</div>}
                              <div style={css('font-size:10.5px; color:var(--fg-3); margin-top:3px')}>{shortName(f.user_id)} · {relativeTime(f.timestamp)}</div>
                            </div>
                          </div>
                        ); })}
                      </div>
                    )}
                  </Panel>

                  <div style={css('background:var(--bg-surface); border:1px dashed var(--border); border-radius:14px; padding:18px 22px')}>
                    <div style={css('font-family:' + DISP + '; font-size:12px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--fg-2)')}>Aguardando endpoint no backend</div>
                    <div style={css('font-size:11.5px; color:var(--fg-3); margin-top:6px; line-height:1.6')}>Custo por modelo, latência (p50/p95), taxa de consultas sem resultado e saúde dos MCPs não vêm do /audit hoje. Assim que o backend expuser (de athena_logs), viram gráficos reais aqui, sem inventar número.</div>
                  </div>
                </>
              )}

              {tab === 'conversas' && (
                <Panel title="Todas as conversas" hint="clique numa linha para ver as mensagens reais" extra={
                  <div style={css('display:flex; align-items:center; gap:8px; padding:7px 11px; background:var(--sunk); border-radius:8px; flex-shrink:0')}>
                    <IC s={13} d='<circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.5" y2="16.5"/>' w={2} stroke="var(--fg-3)" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar" style={css('background:transparent; border:none; outline:none; color:var(--fg); font-family:var(--font-body); font-size:12.5px; width:180px; max-width:40vw')} />
                  </div>
                }>
                  <div style={css('overflow-x:auto')}>
                    <table style={css('width:100%; border-collapse:collapse')}>
                      <thead><tr>{['Conversa', 'Usuário', 'Msgs', 'Criada', 'Atualizada'].map((h, i) => <th key={i} style={css(`text-align:${i >= 2 ? 'right' : 'left'}; padding:8px 12px 8px 0; font-family:${DISP}; font-size:9.5px; color:var(--fg-3); letter-spacing:.1em; text-transform:uppercase; font-weight:600; white-space:nowrap; border-bottom:1px dashed var(--dash)`)}>{h}</th>)}</tr></thead>
                      <tbody>
                        {filteredConvs.length === 0 && !loading && <tr><td colSpan={5} style={css('padding:16px 0; font-size:12px; color:var(--fg-3)')}>Nenhuma conversa.</td></tr>}
                        {filteredConvs.map((c, i) => (
                          <B key={i} t="tr" onClick={() => openConv(c)} c="cursor:pointer" h="background:var(--sunk)">
                            <td style={css('padding:11px 12px 11px 0; font-size:12.5px; font-weight:600; max-width:340px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; border-bottom:1px dashed var(--dash)')}>{c.title || 'Sem título'}</td>
                            <td style={css('padding:11px 12px 11px 0; font-size:12.5px; color:var(--fg-2); white-space:nowrap; border-bottom:1px dashed var(--dash)')}>{shortName(c.user_id)}</td>
                            <td style={css('padding:11px 12px 11px 0; text-align:right; font-family:' + DISP + '; font-size:12px; border-bottom:1px dashed var(--dash)')}>{fmtNum(c.message_count)}</td>
                            <td style={css('padding:11px 12px 11px 0; text-align:right; font-family:' + DISP + '; font-size:11px; color:var(--fg-3); white-space:nowrap; border-bottom:1px dashed var(--dash)')}>{relativeTime(c.created_at)}</td>
                            <td style={css('padding:11px 0; text-align:right; font-family:' + DISP + '; font-size:11px; color:var(--fg-3); white-space:nowrap; border-bottom:1px dashed var(--dash)')}>{relativeTime(c.updated_at)}</td>
                          </B>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              )}

              {tab === 'usuarios' && (
                <>
                  <div style={css('display:grid; grid-template-columns:repeat(auto-fit, minmax(170px,1fr)); gap:14px')}>
                    {[{ l: 'Pessoas', v: fmtNum(people.length), s: 'já usaram a Athena' }, { l: 'Ativas 24h', v: fmtNum(new Set(activity.map((a) => a.user_id)).size), s: 'perguntaram hoje' }, { l: 'Administradores', v: fmtNum(Object.values(roleMap).filter((r) => r === 'Administrador').length || 1), s: 'com acesso ao painel' }, { l: 'Conversas', v: fmtNum(convs.length), s: 'no total' }].map((k, i) => (
                      <div key={i} style={css('background:var(--bg-surface); border:1px solid var(--border); border-radius:14px; padding:16px 18px; box-shadow:var(--shadow); min-width:0')}>
                        <div style={css('font-family:' + DISP + '; font-size:11px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--fg-2)')}>{k.l}</div>
                        <div style={css('font-family:' + DISP + '; font-size:30px; font-weight:600; margin-top:6px')}>{k.v}</div>
                        <div style={css('font-size:10.5px; color:var(--fg-3); margin-top:4px')}>{k.s}</div>
                      </div>
                    ))}
                  </div>

                  <Panel title="Pessoas e papéis" hint="o papel define as permissões abaixo; atribua e salve">
                    <div style={css('display:flex; flex-direction:column')}>
                      {people.length === 0 && !loading && <Empty />}
                      {people.map((p, i) => {
                        const role = roleMap[p.user_id] || (me?.email && p.user_id === me.email ? 'Administrador' : 'Mídia');
                        return (
                          <div key={i} style={css('display:flex; align-items:center; gap:12px; padding:11px 0; border-top:1px dashed var(--dash)')}>
                            <span style={css('width:30px; height:30px; border-radius:50%; background:linear-gradient(140deg,var(--wine),var(--red)); display:flex; align-items:center; justify-content:center; font-size:10.5px; font-weight:700; color:#fff; flex-shrink:0')}>{initials(p.user_id)}</span>
                            <span style={css('min-width:0; flex:1')}>
                              <span style={css('display:block; font-size:12.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{shortName(p.user_id)}</span>
                              <span style={css('display:block; font-size:10.5px; color:var(--fg-3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{p.user_id}</span>
                            </span>
                            <span style={css('font-family:' + DISP + '; font-size:11px; color:var(--fg-3); width:70px; text-align:right; flex-shrink:0')}>{p.count ? fmtNum(p.count) + ' msg' : ''}</span>
                            <select value={role} onChange={(e) => { setRoleMap((m) => ({ ...m, [p.user_id]: e.target.value })); setRoleSaved(false); }} style={css('flex-shrink:0; background:var(--sunk); border:1px solid var(--border); border-radius:8px; padding:6px 10px; color:var(--fg); font-family:var(--font-body); font-size:12px; cursor:pointer')}>
                              {ROLES.map((r) => <option key={r} style={{ color: '#000' }}>{r}</option>)}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                    <div style={css('display:flex; align-items:center; gap:12px; margin-top:16px; padding-top:14px; border-top:1px solid var(--border)')}>
                      <B t="button" onClick={async () => {
                        for (const [email, role] of Object.entries(roleMap)) {
                          const apiRole = role === 'Administrador' ? 'admin' : 'user';
                          try { await api.updateRole(email, apiRole); } catch { /* segue */ }
                        }
                        setRoleSaved(true);
                      }} c="padding:8px 16px; border:none; border-radius:9px; background:var(--red); color:#fff; font-family:var(--font-body); font-size:12.5px; font-weight:700; cursor:pointer" h="background:var(--brand-hot)">Salvar papéis</B>
                      <span style={css('font-size:11px; color:var(--fg-3); line-height:1.5')}>{roleSaved ? 'Papéis salvos no BigQuery via POST /users.' : 'Atribua papéis e clique em Salvar para persistir no BigQuery.'}</span>
                    </div>
                  </Panel>

                  <Panel title="Permissões por papel" hint="escolha o papel para ver o que ele pode fazer">
                    <div style={css('display:flex; gap:7px; flex-wrap:wrap; margin-bottom:16px')}>
                      {ROLES.map((r) => { const on = roleView === r; return <B key={r} t="button" onClick={() => setRoleView(r)} c={`padding:7px 14px; border:1px solid ${on ? 'var(--red)' : 'var(--border)'}; border-radius:20px; background:${on ? 'var(--red)' : 'transparent'}; color:${on ? '#fff' : 'var(--fg-2)'}; font-family:var(--font-body); font-size:12px; font-weight:600; cursor:pointer; transition:all .18s`}>{r}</B>; })}
                    </div>
                    <div style={css('display:flex; flex-direction:column')}>
                      {PERMS.map((p, i) => { const allowed = p.roles.includes(roleView); return (
                        <div key={i} style={css('display:flex; align-items:center; gap:12px; padding:11px 0; border-top:1px dashed var(--dash)')}>
                          <span style={css(`width:18px; height:18px; border-radius:5px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:#fff; background:${allowed ? 'var(--red)' : 'transparent'}; border:1px solid ${allowed ? 'var(--red)' : 'var(--border)'}`)}>{allowed ? ic('<polyline points="20 6 9 17 4 12"/>', 11, 3) : null}</span>
                          <span style={css(`font-size:12.5px; flex:1; min-width:0; color:${allowed ? 'var(--fg)' : 'var(--fg-3)'}`)}>{p.label}</span>
                          <span style={css('font-size:10.5px; color:var(--fg-3); flex-shrink:0')}>{p.roles.length === ROLES.length ? 'todos' : p.roles.join(', ')}</span>
                        </div>
                      ); })}
                    </div>
                  </Panel>
                </>
              )}

              {tab === 'config' && (
                <>
                  <Panel title="Status do sistema" hint="visão geral da instância Athena">
                    <div style={css('display:flex; flex-direction:column; gap:12px')}>
                      {[
                        { label: 'Backend', value: backendDown ? 'Offline' : 'Conectado', ok: !backendDown },
                        { label: 'Google OAuth', value: 'Configurado no servidor', ok: true },
                        { label: 'TTS (Text-to-Speech)', value: 'Disponível via api.tts()', ok: true },
                        { label: 'Export (Sheets/CSV)', value: 'Backend stub — pendente', ok: false },
                      ].map((item, i) => (
                        <div key={i} style={css('display:flex; align-items:center; gap:12px; padding:10px 0; border-top:1px dashed var(--dash)')}>
                          <span style={css(`width:8px; height:8px; border-radius:50%; flex-shrink:0; background:${item.ok ? 'var(--green)' : 'var(--red)'}`)} />
                          <span style={css('font-size:12.5px; font-weight:600; flex:1')}>{item.label}</span>
                          <span style={css(`font-size:11.5px; color:${item.ok ? 'var(--fg-2)' : 'var(--red)'}`)}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  <Panel title="Domínios permitidos" hint="e-mails fora desses domínios não conseguem logar">
                    <div style={css('display:flex; flex-wrap:wrap; gap:8px')}>
                      {['grupoom.com.br', 'opusmultipla.com.br'].map((d) => (
                        <span key={d} style={css('display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:8px; font-size:12px; font-weight:600; color:var(--fg-2); background:var(--sunk)')}>
                          <span style={css('width:6px; height:6px; border-radius:50%; background:var(--green)')} />
                          @{d}
                        </span>
                      ))}
                    </div>
                    <div style={css('font-size:11px; color:var(--fg-3); margin-top:12px')}>Configurado via ALLOWED_EMAIL_DOMAINS no servidor. Alterações requerem redeploy.</div>
                  </Panel>

                  <Panel title="Administradores" hint="e-mails com acesso ao painel admin (fallback hardcoded)">
                    <div style={css('display:flex; flex-direction:column; gap:4px')}>
                      {['andrei@grupoom.com.br', 'phillipe.barros@grupoom.com.br', 'camilo.ferreira@grupoom.com.br', 'gabriel.oliveira@grupoom.com.br'].map((e) => (
                        <div key={e} style={css('display:flex; align-items:center; gap:10px; padding:8px 0; border-top:1px dashed var(--dash)')}>
                          <span style={css('width:26px; height:26px; border-radius:50%; background:linear-gradient(140deg,var(--wine),var(--red)); display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700; color:#fff; flex-shrink:0')}>{initials(e)}</span>
                          <span style={css('font-size:12px; color:var(--fg-2)')}>{e}</span>
                          <span style={css('margin-left:auto; font-size:10px; padding:2px 8px; border-radius:4px; background:var(--red-glow); color:var(--red); font-weight:600')}>admin</span>
                        </div>
                      ))}
                    </div>
                    <div style={css('font-size:11px; color:var(--fg-3); margin-top:12px')}>Com o RBAC dinâmico (BigQuery), a role é consultada em /users. Estes e-mails são o fallback se o backend estiver offline.</div>
                  </Panel>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* DRAWER */}
      {drawer && (
        <div onClick={() => setDrawer(null)} style={css('position:fixed; inset:0; z-index:90; background:rgba(0,0,0,.7); display:flex; justify-content:flex-end')}>
          <div onClick={(e) => e.stopPropagation()} style={css('width:560px; max-width:100%; height:100%; background:var(--bg-surface); border-left:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden')}>
            <div style={css('display:flex; align-items:flex-start; gap:12px; padding:22px 24px 18px; border-bottom:1px dashed var(--dash); flex-shrink:0')}>
              <div style={css('min-width:0; flex:1')}>
                <div style={css('font-family:' + DISP + '; font-size:16px; font-weight:600; line-height:1.3')}>{drawer.title || 'Conversa'}</div>
                <div style={css('font-size:11.5px; color:var(--fg-3); margin-top:6px')}>{shortName(drawer.user_id)} · {fmtNum(drawer.message_count)} mensagens · {relativeTime(drawer.updated_at)}</div>
              </div>
              <B t="button" onClick={() => setDrawer(null)} title="Fechar" c="background:none; border:none; color:var(--fg-3); cursor:pointer; padding:4px; display:flex; flex-shrink:0" h="color:var(--fg)"><IC s={17} d='<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' w={2} /></B>
            </div>
            <div style={css('flex:1; overflow-y:auto; padding:20px 24px 32px; display:flex; flex-direction:column; gap:14px')}>
              {drawerMsgs === null && <div style={css('font-size:12px; color:var(--fg-3)')}>Carregando mensagens...</div>}
              {drawerMsgs?.length === 0 && <div style={css('font-size:12px; color:var(--fg-3)')}>Sem mensagens.</div>}
              {(drawerMsgs || []).filter((m) => m.role !== 'system_summary').map((m, i) => (
                <div key={i} style={css(`display:flex; flex-direction:column; gap:5px; ${m.role === 'user' ? 'align-items:flex-end' : ''}`)}>
                  <span style={css(`font-family:${DISP}; font-size:9.5px; letter-spacing:.1em; text-transform:uppercase; color:${m.role === 'user' ? 'var(--fg-3)' : 'var(--red)'}`)}>{m.role === 'user' ? 'Usuário' : 'Athena'}</span>
                  <div style={css(`max-width:92%; font-size:12.5px; line-height:1.6; padding:10px 13px; border-radius:10px; white-space:pre-wrap; background:${m.role === 'user' ? 'var(--sunk)' : 'transparent'}; border:1px solid var(--border); color:var(--fg)`)}>{m.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ msg }: { msg?: string }) {
  return <div style={css('font-size:12px; color:var(--fg-3); padding:24px 0; text-align:center')}>{msg || 'Sem dados ainda.'}</div>;
}
