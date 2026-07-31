'use client';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, auth, isBackendError } from '@/lib/api';
import type { AthenaUser } from '@/lib/types';
import { B, IC, css } from '@/lib/dc';
import { useTheme } from '@/lib/theme';
import { Sidebar } from '@/components/chat/Sidebar';
import { relativeTime, fmtNum, initials, shortName } from '@/lib/format';
import { KpiSkeleton } from '@/components/chat/SkeletonLoaders';
import { motion, AnimatePresence } from 'framer-motion';

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

/* ─── KPI Icons ─── */
const KPI_ICONS = [
  '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', // mensagens
  '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>', // conversas
  '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>', // usuários
  '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>', // assertividade
  '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>', // fb+
  '<path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>', // fb-
];

/* ─── Animated Panel ─── */
const Panel = ({ title, hint, children, extra, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    style={{
      background: 'var(--glass-surface)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      border: '1px solid var(--glass-border)',
      borderRadius: 16,
      padding: '22px 24px',
      boxShadow: 'var(--shadow-md)',
      minWidth: 0,
      transition: 'border-color .25s ease, box-shadow .25s ease',
    }}
    whileHover={{ borderColor: 'rgba(221,0,4,0.12)' }}
  >
    <div style={css('display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:18px')}>
      <div style={css('min-width:0')}>
        <div style={css('font-size:15px; font-weight:700; letter-spacing:.01em')}>{title}</div>
        {hint && <div style={css('font-size:11.5px; color:var(--fg-3); margin-top:5px; line-height:1.5')}>{hint}</div>}
      </div>
      {extra}
    </div>
    {children}
  </motion.div>
);

/* ─── Domain Manager (dinâmico via API) ─── */
const DomainManager = () => {
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDomains().then((r) => { setDomains(r.domains || []); setLoading(false); });
  }, []);

  const addDomain = async () => {
    const d = newDomain.trim().toLowerCase();
    if (!d || !d.includes('.')) return;
    try {
      await api.addDomain(d);
      setDomains((prev) => [...prev.filter(x => x !== d), d]);
      setNewDomain('');
    } catch { /* silencioso */ }
  };

  const removeDomain = async (d: string) => {
    try {
      await api.removeDomain(d);
      setDomains((prev) => prev.filter(x => x !== d));
    } catch { /* silencioso */ }
  };

  if (loading) return <div style={css('font-size:12px; color:var(--fg-3)')}>Carregando domínios...</div>;

  return (
    <>
      <div style={css('display:flex; flex-wrap:wrap; gap:10px')}>
        {domains.map((d) => (
          <span key={d} style={css('display:inline-flex; align-items:center; gap:8px; padding:8px 14px; border:1px solid var(--border); border-radius:10px; font-size:12.5px; font-weight:600; color:var(--fg-2); background:var(--sunk)')}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px rgba(63,185,80,.3)' }} />
            @{d}
            <button
              onClick={() => removeDomain(d)}
              style={css('background:none; border:none; color:var(--fg-3); cursor:pointer; padding:0 2px; font-size:14px; line-height:1; transition:color .2s')}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-3)'; }}
              title={`Remover @${d}`}
            >×</button>
          </span>
        ))}
      </div>
      <div style={css('display:flex; gap:8px; margin-top:14px')}>
        <input
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addDomain(); }}
          placeholder="novodominio.com.br"
          style={css('flex:1; padding:8px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg-input); color:var(--white); font-size:12.5px; outline:none; font-family:var(--font-body)')}
        />
        <button
          onClick={addDomain}
          disabled={!newDomain.trim().includes('.')}
          style={css(`padding:8px 16px; border-radius:8px; border:none; font-size:12px; font-weight:600; cursor:${newDomain.trim().includes('.') ? 'pointer' : 'default'}; background:${newDomain.trim().includes('.') ? 'var(--red)' : 'var(--border)'}; color:#fff; transition:all .2s`)}
        >Adicionar</button>
      </div>
      <div style={css('font-size:11.5px; color:var(--fg-3); margin-top:10px; line-height:1.6')}>Gerenciado dinamicamente. Alterações aplicam imediatamente sem redeploy.</div>
    </>
  );
};

export default function AdminPage() {
  return <Suspense fallback={<div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--page)', color: 'var(--fg-3)', fontFamily: 'var(--font-body)', fontSize: 14 }}><KpiSkeleton count={5} /></div>}><AdminPageInner /></Suspense>;
}

function AdminPageInner() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const { light, toggle } = useTheme();
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
  // Admin expanded: system stats + MCP health
  const [systemStats, setSystemStats] = useState<any>(null);
  const [mcpHealth, setMcpHealth] = useState<any>(null);

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
      api.audit('recent_feedback'), api.audit('all_conversations'), api.listUsers(),
      api.audit('system_stats'), api.audit('mcp_health'),
    ]);
    const [k, tu, act, fb, cv, usr, ss, mh] = r;
    if (k.status === 'fulfilled') setKpis(k.value.data);
    if (tu.status === 'fulfilled') setTopUsers(tu.value.data || []);
    if (act.status === 'fulfilled') setActivity(act.value.data || []);
    if (fb.status === 'fulfilled') setFeedback(fb.value.data || []);
    if (cv.status === 'fulfilled') setConvs(cv.value.data || []);
    if (ss.status === 'fulfilled') setSystemStats(ss.value.data);
    if (mh.status === 'fulfilled') setMcpHealth(mh.value.data);
    if (usr.status === 'fulfilled') {
      const usersData = usr.value.users || [];
      const newRoleMap: Record<string, string> = {};
      usersData.forEach((u) => { newRoleMap[u.email] = u.role || 'Mídia'; });
      setRoleMap(newRoleMap);
    }
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

  if (checking) return <div style={css('display:flex; height:100vh; align-items:center; justify-content:center; background:var(--page); color:var(--fg-3); font-family:var(--font-body); font-size:14px')}><KpiSkeleton count={5} /></div>;

  const kpiCards = kpis ? [
    { label: 'Mensagens', value: fmtNum(kpis.total_messages), sub: 'total registrado', icon: KPI_ICONS[0] },
    { label: 'Conversas ativas', value: fmtNum(kpis.active_conversations), sub: 'status ativo', icon: KPI_ICONS[1] },
    { label: 'Usuários', value: fmtNum(kpis.unique_users), sub: 'já perguntaram', icon: KPI_ICONS[2] },
    { label: 'Assertividade', value: assert == null ? '—' : assert + '%', sub: totalFb ? `${fmtNum(pos)} de ${fmtNum(totalFb)} avaliações` : 'sem feedback ainda', icon: KPI_ICONS[3] },
    { label: 'Feedback +', value: fmtNum(pos), sub: 'úteis', icon: KPI_ICONS[4] },
    { label: 'Feedback −', value: fmtNum(neg), sub: 'correções', icon: KPI_ICONS[5] },
  ] : [];

  const tabs = [
    { id: 'visao', label: 'Visão geral', d: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>' },
    { id: 'conversas', label: 'Conversas', d: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
    { id: 'usuarios', label: 'Usuários e permissões', d: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>' },
    { id: 'config', label: 'Configurações', d: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' },
  ];

  const dashTarget = assert != null ? (1 - assert / 100) * 314 : 314;

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
        onToggleTheme={toggle}
      />

      {/* MAIN */}
      <main style={css('flex:1; min-width:0; display:flex; flex-direction:column; overflow:hidden')}>
        {/* ─── Tab Header with animated indicator ─── */}
        <header style={css('height:64px; flex-shrink:0; display:flex; align-items:center; gap:6px; padding:0 24px; background:var(--glass-surface); backdrop-filter:var(--glass-blur); border-bottom:1px solid var(--glass-border); z-index:3')}>
          <div style={css('flex:1; min-width:0; display:flex; align-items:center; gap:4px; position:relative')}>
            {tabs.map((tb) => { const on = tab === tb.id; return (
              <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                border: 'none', borderRadius: 10, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: on ? 700 : 500,
                cursor: 'pointer', color: on ? 'var(--fg)' : 'var(--fg-2)', background: 'transparent',
                transition: 'color .2s ease', zIndex: 1,
              }}>
                {on && (
                  <motion.div
                    layoutId="admin-tab-bg"
                    style={{ position: 'absolute', inset: 0, borderRadius: 10, background: 'var(--sunk)', border: '1px solid var(--border-faint)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {ic(tb.d, 15, 1.7)}{tb.label}
                </span>
              </button>
            ); })}
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={loadAll}
            style={{
              height: 36, padding: '0 15px', border: '1px solid var(--border)', borderRadius: 10,
              background: 'var(--bg-card)', fontSize: 12.5, color: 'var(--fg-2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontWeight: 600,
              transition: 'border-color .2s, color .2s',
            }}
          >
            {ic('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>', 14, 2)} Atualizar
          </motion.button>
        </header>

        <div style={css('flex:1; overflow-y:auto; overflow-x:hidden; padding:22px 24px 44px')}>
          {backendDown ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={css('max-width:560px; margin:8vh auto 0; text-align:center; display:flex; flex-direction:column; align-items:center; gap:16px')}>
              <span style={css('width:56px; height:56px; border-radius:16px; background:var(--red-glow); border:1px solid rgba(221,0,4,.25); display:flex; align-items:center; justify-content:center; color:var(--red)')}>{ic('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', 24)}</span>
              <div style={css('font-family:' + DISP + '; font-size:20px; font-weight:600')}>Backend não conectado</div>
              <div style={css('font-size:13.5px; color:var(--fg-2); line-height:1.7')}>Defina ATHENA_BACKEND_URL e ATHENA_BACKEND_TOKEN no servidor. Este painel só mostra dados reais do endpoint /audit, nada é fabricado.</div>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} style={css('display:flex; flex-direction:column; gap:18px')}>
                {loading && <KpiSkeleton count={5} />}

                {tab === 'visao' && (
                  <>
                    {/* KPI Cards with glassmorphism + icons */}
                    <div style={css('display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:16px')}>
                      {kpiCards.map((k, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          style={{
                            background: 'var(--glass-surface)',
                            backdropFilter: 'var(--glass-blur)',
                            WebkitBackdropFilter: 'var(--glass-blur)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 16,
                            padding: '18px 20px',
                            boxShadow: 'var(--shadow-sm)',
                            minWidth: 0,
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Decorative icon background */}
                          <div style={{ position: 'absolute', top: 12, right: 14, opacity: 0.06 }}>
                            <IC s={42} d={k.icon} w={1.5} />
                          </div>
                          <div style={css('font-family:' + DISP + '; font-size:11.5px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--fg-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{k.label}</div>
                          <div style={css('font-family:' + DISP + '; font-size:34px; font-weight:600; letter-spacing:.01em; margin-top:8px; color:var(--fg)')}>{k.value}</div>
                          <div style={css('font-size:11px; color:var(--fg-3); margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{k.sub}</div>
                        </motion.div>
                      ))}
                      {!kpis && !loading && <div style={css('font-size:12px; color:var(--fg-3)')}>Sem KPIs.</div>}
                    </div>

                    {/* Charts row 1 */}
                    <div style={css('display:grid; grid-template-columns:2fr 1fr; gap:18px; align-items:start')}>
                      <Panel title="Conversas por dia" hint="derivado de created_at das conversas reais" delay={0.1}>
                        {byDay.days.length === 0 ? <Empty /> : (
                          <>
                            <div style={css('display:flex; align-items:flex-end; gap:6px; height:180px')}>
                              {byDay.days.map((d, i) => (
                                <div key={i} title={`${d.label}: ${d.v}`} style={css('flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; gap:6px; min-width:0')}>
                                  <span style={css('font-family:' + DISP + '; font-size:9.5px; color:var(--fg-3)')}>{d.v || ''}</span>
                                  <motion.div
                                    initial={{ scaleY: 0 }}
                                    animate={{ scaleY: 1 }}
                                    transition={{ delay: 0.2 + i * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                    style={{ width: '100%', maxWidth: 28, height: `${Math.max(3, d.h)}%`, borderRadius: '6px 6px 0 0', background: 'linear-gradient(180deg, var(--red), var(--wine) 85%, rgba(121,31,35,0.3))', transformOrigin: 'bottom', boxShadow: d.v ? '0 -2px 8px rgba(221,0,4,.15)' : 'none' }}
                                  />
                                </div>
                              ))}
                            </div>
                            <div style={css('display:flex; gap:6px; margin-top:10px')}>
                              {byDay.days.map((d, i) => <span key={i} style={css('flex:1; text-align:center; font-family:' + DISP + '; font-size:9px; color:var(--fg-3); min-width:0; white-space:nowrap; overflow:hidden')}>{d.label}</span>)}
                            </div>
                          </>
                        )}
                      </Panel>
                      <Panel title="Assertividade" hint="do feedback real (positivo/negativo)" delay={0.15}>
                        {totalFb === 0 ? <Empty msg="Sem feedback ainda." /> : (
                          <div style={css('display:flex; flex-direction:column; align-items:center; gap:18px')}>
                            <div style={css('position:relative; width:160px; height:160px')}>
                              <svg viewBox="0 0 120 120" style={css('width:100%; height:100%; transform:rotate(-90deg)')}>
                                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--sunk)" strokeWidth="14" />
                                <motion.circle
                                  cx="60" cy="60" r="50" fill="none" stroke="var(--red)" strokeWidth="14" strokeLinecap="round"
                                  initial={{ strokeDasharray: '0 314' }}
                                  animate={{ strokeDasharray: `${(assert || 0) / 100 * 314} 314` }}
                                  transition={{ delay: 0.3, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                                  style={{ filter: 'drop-shadow(0 0 6px rgba(221,0,4,.3))' }}
                                />
                              </svg>
                              <div style={css('position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center')}>
                                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} style={css('font-family:' + DISP + '; font-size:34px; font-weight:600')}>{assert}%</motion.span>
                                <span style={css('font-size:10.5px; color:var(--fg-3)')}>útil</span>
                              </div>
                            </div>
                            <div style={css('display:flex; gap:20px')}>
                              <span style={css('display:flex; align-items:center; gap:7px; font-size:12.5px; color:var(--fg-2)')}><span style={css('width:9px; height:9px; border-radius:3px; background:var(--red)')} />{fmtNum(pos)} úteis</span>
                              <span style={css('display:flex; align-items:center; gap:7px; font-size:12.5px; color:var(--fg-2)')}><span style={css('width:9px; height:9px; border-radius:3px; background:var(--sunk); border:1px solid var(--border)')} />{fmtNum(neg)} correções</span>
                            </div>
                          </div>
                        )}
                      </Panel>
                    </div>

                    {/* Charts row 2 */}
                    <div style={css('display:grid; grid-template-columns:1fr 1fr 1fr; gap:18px; align-items:start')}>
                      <Panel title="Atividade por hora" hint="perguntas das últimas 24h" delay={0.2}>
                        <div style={css('display:flex; align-items:flex-end; gap:2px; height:130px')}>
                          {byHour.map((b, i) => (
                            <motion.div
                              key={i} title={`${b.h}h: ${b.v}`}
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              transition={{ delay: 0.3 + i * 0.015, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                              style={{ flex: 1, height: `${Math.max(3, b.ht)}%`, borderRadius: 3, background: b.v ? 'linear-gradient(180deg, var(--red), var(--wine))' : 'var(--sunk)', transformOrigin: 'bottom' }}
                            />
                          ))}
                        </div>
                        <div style={css('display:flex; justify-content:space-between; margin-top:10px; font-family:' + DISP + '; font-size:9px; color:var(--fg-3)')}><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
                      </Panel>
                      <Panel title="Mensagens por conversa" hint="distribuição real" delay={0.25}>
                        <div style={css('display:flex; align-items:flex-end; gap:12px; height:130px')}>
                          {msgDist.map((b, i) => (
                            <div key={i} style={css('flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; gap:6px; min-width:0')}>
                              <span style={css('font-family:' + DISP + '; font-size:10.5px; color:var(--fg-2)')}>{b.v}</span>
                              <motion.div
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: 1 }}
                                transition={{ delay: 0.3 + i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                style={{ width: '100%', maxWidth: 36, height: `${Math.max(3, b.h)}%`, borderRadius: '6px 6px 0 0', background: 'linear-gradient(180deg, var(--wine), rgba(121,31,35,0.5))', transformOrigin: 'bottom' }}
                              />
                              <span style={css('font-family:' + DISP + '; font-size:9.5px; color:var(--fg-3)')}>{b.label}</span>
                            </div>
                          ))}
                        </div>
                      </Panel>
                      <Panel title="Top usuários" hint="por mensagens" delay={0.3}>
                        <div style={css('display:flex; flex-direction:column; gap:11px')}>
                          {topUsers.length === 0 && !loading && <Empty />}
                          {topUsers.slice(0, 6).map((u, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.06 }} style={css('display:flex; align-items:center; gap:10px')}>
                              <span style={css('font-size:12px; color:var(--fg-2); width:100px; flex-shrink:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{shortName(u.user_id)}</span>
                              <span style={css('flex:1; min-width:0; height:8px; border-radius:6px; background:var(--sunk); overflow:hidden')}>
                                <motion.span
                                  initial={{ width: '0%' }}
                                  animate={{ width: `${Math.round(num(u.message_count) / maxUser * 100)}%` }}
                                  transition={{ delay: 0.4 + i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                  style={{ display: 'block', height: '100%', borderRadius: 6, background: 'linear-gradient(90deg, var(--red), var(--wine))' }}
                                />
                              </span>
                              <span style={css('font-family:' + DISP + '; font-size:11.5px; width:40px; text-align:right; flex-shrink:0')}>{fmtNum(u.message_count)}</span>
                            </motion.div>
                          ))}
                        </div>
                      </Panel>
                    </div>

                    {/* Feedback recente */}
                    <Panel title="Feedback recente" hint="correções (negativas) alimentam a curadoria do aprendizado" delay={0.35}>
                      {feedback.length === 0 && !loading ? <Empty msg="Nenhum feedback ainda." /> : (
                        <div style={css('display:flex; flex-direction:column')}>
                          {feedback.slice(0, 8).map((f, i) => { const neg = f.rating === 'negative'; return (
                            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.04 }} style={css('display:flex; gap:14px; padding:13px 0; border-top:1px dashed var(--dash)')}>
                              <span style={css(`width:24px; height:24px; border-radius:7px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:${neg ? 'var(--red)' : 'var(--green)'}; background:${neg ? 'var(--red-glow)' : 'rgba(63,185,80,.12)'}`)}>{ic(neg ? '<path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>' : '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>', 13, 2)}</span>
                              <div style={css('flex:1; min-width:0')}>
                                <div style={css('font-size:13px; color:var(--fg); line-height:1.5')}>{f.user_query || '(sem pergunta registrada)'}</div>
                                {f.comment && <div style={css(`font-size:12px; color:${neg ? 'var(--red)' : 'var(--fg-2)'}; margin-top:4px`)}>&ldquo;{f.comment}&rdquo;</div>}
                                <div style={css('font-size:11px; color:var(--fg-3); margin-top:4px')}>{shortName(f.user_id)} · {relativeTime(f.timestamp)}</div>
                              </div>
                            </motion.div>
                          ); })}
                        </div>
                      )}
                    </Panel>

                    <div style={css('background:var(--glass-surface); backdrop-filter:var(--glass-blur); border:1px dashed var(--border); border-radius:16px; padding:20px 24px')}>
                      <div style={css('font-family:' + DISP + '; font-size:12.5px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--fg-2)')}>Aguardando endpoint no backend</div>
                      <div style={css('font-size:12px; color:var(--fg-3); margin-top:8px; line-height:1.7')}>Custo por modelo, latência (p50/p95), taxa de consultas sem resultado e saúde dos MCPs não vêm do /audit hoje. Assim que o backend expuser (de athena_logs), viram gráficos reais aqui, sem inventar número.</div>
                    </div>
                  </>
                )}

                {tab === 'conversas' && (
                  <Panel title="Todas as conversas" hint="clique numa linha para ver as mensagens reais" extra={
                    <div style={css('display:flex; align-items:center; gap:8px; padding:8px 12px; background:var(--sunk); border-radius:10px; flex-shrink:0')}>
                      <IC s={14} d='<circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.5" y2="16.5"/>' w={2} stroke="var(--fg-3)" />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar" style={css('background:transparent; border:none; outline:none; color:var(--fg); font-family:var(--font-body); font-size:13px; width:200px; max-width:40vw')} />
                    </div>
                  }>
                    <div style={css('overflow-x:auto')}>
                      <table style={css('width:100%; border-collapse:collapse')}>
                        <thead><tr>{['Conversa', 'Usuário', 'Msgs', 'Criada', 'Atualizada'].map((h, i) => <th key={i} style={css(`text-align:${i >= 2 ? 'right' : 'left'}; padding:12px 14px 12px 0; font-family:${DISP}; font-size:10.5px; color:var(--fg-3); letter-spacing:.1em; text-transform:uppercase; font-weight:600; white-space:nowrap; border-bottom:1px solid var(--border)`)}>{h}</th>)}</tr></thead>
                        <tbody>
                          {filteredConvs.length === 0 && !loading && <tr><td colSpan={5} style={css('padding:18px 0; font-size:13px; color:var(--fg-3)')}>Nenhuma conversa.</td></tr>}
                          {filteredConvs.map((c, i) => (
                            <motion.tr
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.02 }}
                              onClick={() => openConv(c)}
                              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--glass-hover)'}
                              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                              style={{ transition: 'background 0.15s ease', cursor: 'pointer', borderBottom: '1px solid var(--border-faint)' }}
                            >
                              <td style={css('padding:14px 14px 14px 0; font-size:13.5px; font-weight:500; max-width:340px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;')}>{c.title || 'Sem título'}</td>
                              <td style={css('padding:14px 14px 14px 0; font-size:13.5px; color:var(--fg-2); white-space:nowrap;')}>{shortName(c.user_id)}</td>
                              <td style={css('padding:14px 14px 14px 0; text-align:right; font-family:' + DISP + '; font-size:13.5px;')}>{fmtNum(c.message_count)}</td>
                              <td style={css('padding:14px 14px 14px 0; text-align:right; font-family:' + DISP + '; font-size:12.5px; color:var(--fg-3); white-space:nowrap;')}>{relativeTime(c.created_at)}</td>
                              <td style={css('padding:14px 0; text-align:right; font-family:' + DISP + '; font-size:12.5px; color:var(--fg-3); white-space:nowrap;')}>{relativeTime(c.updated_at)}</td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                )}

                {tab === 'usuarios' && (
                  <>
                    <div style={css('display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:16px')}>
                      {[{ l: 'Pessoas', v: fmtNum(people.length), s: 'já usaram a Athena' }, { l: 'Ativas 24h', v: fmtNum(new Set(activity.map((a) => a.user_id)).size), s: 'perguntaram hoje' }, { l: 'Administradores', v: fmtNum(Object.values(roleMap).filter((r) => r === 'Administrador').length || 1), s: 'com acesso ao painel' }, { l: 'Conversas', v: fmtNum(convs.length), s: 'no total' }].map((k, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} style={{ background: 'var(--glass-surface)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)', borderRadius: 16, padding: '18px 20px', boxShadow: 'var(--shadow-sm)', minWidth: 0 }}>
                          <div style={css('font-family:' + DISP + '; font-size:11.5px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--fg-2)')}>{k.l}</div>
                          <div style={css('font-family:' + DISP + '; font-size:34px; font-weight:600; margin-top:8px')}>{k.v}</div>
                          <div style={css('font-size:11px; color:var(--fg-3); margin-top:5px')}>{k.s}</div>
                        </motion.div>
                      ))}
                    </div>

                    <Panel title="Pessoas e papéis" hint="o papel define as permissões abaixo; atribua e salve" delay={0.1}>
                      <div style={css('display:flex; flex-direction:column')}>
                        {people.length === 0 && !loading && <Empty />}
                        {people.map((p, i) => {
                          const role = roleMap[p.user_id] || (me?.email && p.user_id === me.email ? 'Administrador' : 'Mídia');
                          const apiRole = role === 'Administrador' ? 'admin' : 'user';
                          return (
                            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.03 }} style={css('display:flex; align-items:center; gap:14px; padding:13px 0; border-top:1px dashed var(--dash)')}>
                              <span style={css('width:34px; height:34px; border-radius:50%; background:linear-gradient(140deg,var(--wine),var(--red)); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#fff; flex-shrink:0')}>{initials(p.user_id)}</span>
                              <span style={css('min-width:0; flex:1')}>
                                <span style={css('display:block; font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{shortName(p.user_id)}</span>
                                <span style={css('display:block; font-size:11px; color:var(--fg-3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis')}>{p.user_id}</span>
                              </span>
                              <span style={css('font-family:' + DISP + '; font-size:11.5px; color:var(--fg-3); width:75px; text-align:right; flex-shrink:0')}>{p.count ? fmtNum(p.count) + ' msg' : ''}</span>
                              <select value={role} onChange={(e) => { setRoleMap((m) => ({ ...m, [p.user_id]: e.target.value })); setRoleSaved(false); }} style={css('flex-shrink:0; background:var(--sunk); border:1px solid var(--border); border-radius:9px; padding:7px 12px; color:var(--fg); font-family:var(--font-body); font-size:12.5px; cursor:pointer')}>
                                {ROLES.map((r) => <option key={r} style={{ color: '#000' }}>{r}</option>)}
                              </select>
                            </motion.div>
                          );
                        })}
                      </div>
                      <div style={css('display:flex; align-items:center; gap:14px; margin-top:18px; padding-top:16px; border-top:1px solid var(--border)')}>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={async () => {
                          for (const [email, role] of Object.entries(roleMap)) {
                            try { await api.updateRole(email, role); } catch { /* segue */ }
                          }
                          setRoleSaved(true);
                        }} style={{ padding: '9px 18px', border: 'none', borderRadius: 10, background: 'var(--red)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(221,0,4,.2)' }}>Salvar papéis</motion.button>
                        <span style={css('font-size:11.5px; color:var(--fg-3); line-height:1.5')}>{roleSaved ? 'Papéis salvos no BigQuery via POST /users.' : 'Atribua papéis e clique em Salvar para persistir no BigQuery.'}</span>
                      </div>
                    </Panel>

                    <Panel title="Permissões por papel" hint="escolha o papel para ver o que ele pode fazer" delay={0.15}>
                      <div style={css('display:flex; gap:8px; flex-wrap:wrap; margin-bottom:18px')}>
                        {ROLES.map((r) => { const on = roleView === r; return (
                          <motion.button key={r} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setRoleView(r)} style={{
                            padding: '8px 16px', border: `1px solid ${on ? 'var(--red)' : 'var(--border)'}`, borderRadius: 22,
                            background: on ? 'var(--red)' : 'transparent', color: on ? '#fff' : 'var(--fg-2)',
                            fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
                          }}>{r}</motion.button>
                        ); })}
                      </div>
                      <div style={css('display:flex; flex-direction:column')}>
                        {PERMS.map((p, i) => { const allowed = p.roles.includes(roleView); return (
                          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 * i }} style={css('display:flex; align-items:center; gap:14px; padding:13px 0; border-top:1px dashed var(--dash)')}>
                            <span style={css(`width:20px; height:20px; border-radius:6px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:#fff; background:${allowed ? 'var(--red)' : 'transparent'}; border:1px solid ${allowed ? 'var(--red)' : 'var(--border)'}; transition:all .2s`)}>{allowed ? ic('<polyline points="20 6 9 17 4 12"/>', 12, 3) : null}</span>
                            <span style={css(`font-size:13px; flex:1; min-width:0; color:${allowed ? 'var(--fg)' : 'var(--fg-3)'}; transition:color .2s`)}>{p.label}</span>
                            <span style={css('font-size:11px; color:var(--fg-3); flex-shrink:0')}>{p.roles.length === ROLES.length ? 'todos' : p.roles.join(', ')}</span>
                          </motion.div>
                        ); })}
                      </div>
                    </Panel>
                  </>
                )}

                {tab === 'config' && (
                  <>
                    <Panel title="Status do sistema" hint="visão geral da instância Athena" delay={0.05}>
                      <div style={css('display:flex; flex-direction:column; gap:4px')}>
                        {[
                          { label: 'Backend', value: backendDown ? 'Offline' : 'Conectado', ok: !backendDown },
                          { label: 'Google OAuth', value: 'Configurado no servidor', ok: true },
                          { label: 'TTS (Text-to-Speech)', value: 'Disponível via api.tts()', ok: true },
                          { label: 'Export (Sheets/CSV)', value: 'Backend stub — pendente', ok: false },
                        ].map((item, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }} style={css('display:flex; align-items:center; gap:14px; padding:12px 0; border-top:1px dashed var(--dash)')}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: item.ok ? 'var(--green)' : 'var(--red)', boxShadow: item.ok ? '0 0 8px rgba(63,185,80,.3)' : '0 0 8px rgba(221,0,4,.3)' }} />
                            <span style={css('font-size:13px; font-weight:600; flex:1')}>{item.label}</span>
                            <span style={css(`font-size:12px; color:${item.ok ? 'var(--fg-2)' : 'var(--red)'}`)}>{item.value}</span>
                          </motion.div>
                        ))}
                      </div>
                    </Panel>

                    <Panel title="Domínios permitidos" hint="e-mails fora desses domínios não conseguem logar" delay={0.1}>
                      <DomainManager />
                    </Panel>

                    <Panel title="Administradores" hint="e-mails com acesso ao painel admin (fallback hardcoded)" delay={0.15}>
                      <div style={css('display:flex; flex-direction:column; gap:4px')}>
                        {['andrei@grupoom.com.br', 'phillipe.barros@grupoom.com.br', 'camilo.ferreira@grupoom.com.br', 'gabriel.oliveira@grupoom.com.br'].map((e, i) => (
                          <motion.div key={e} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.04 }} style={css('display:flex; align-items:center; gap:12px; padding:10px 0; border-top:1px dashed var(--dash)')}>
                            <span style={css('width:30px; height:30px; border-radius:50%; background:linear-gradient(140deg,var(--wine),var(--red)); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#fff; flex-shrink:0')}>{initials(e)}</span>
                            <span style={css('font-size:12.5px; color:var(--fg-2)')}>{e}</span>
                            <span style={css('margin-left:auto; font-size:10.5px; padding:3px 10px; border-radius:6px; background:var(--red-glow); color:var(--red); font-weight:600')}>admin</span>
                          </motion.div>
                        ))}
                      </div>
                      <div style={css('font-size:11.5px; color:var(--fg-3); margin-top:14px; line-height:1.6')}>Com o RBAC dinâmico (BigQuery), a role é consultada em /users. Estes e-mails são o fallback se o backend estiver offline.</div>
                    </Panel>

                    {/* System Metrics — latência, custo, sem resultado */}
                    <Panel title="Métricas de sistema" hint="últimos 30 dias — latência, custo estimado, taxa sem resultado" delay={0.2}>
                      {systemStats ? (
                        <div style={css('display:grid; grid-template-columns:repeat(auto-fit, minmax(130px,1fr)); gap:14px')}>
                          {[
                            { l: 'Latência média', v: `${systemStats.avg_latency_sec || 0}s`, s: 'user→assistant' },
                            { l: 'Sem resultado', v: `${systemStats.no_result_pct || 0}%`, s: `${systemStats.no_result_count || 0} de ${systemStats.total_messages_30d || 0}` },
                            { l: 'Custo estimado', v: `$${systemStats.estimated_cost_month_usd || 0}`, s: 'mês atual (est.)' },
                            { l: 'Modelo', v: (systemStats.model || '').split('-').slice(-3, -1).join('-') || systemStats.model, s: systemStats.model },
                            { l: 'Msgs 30d', v: fmtNum(systemStats.total_messages_30d || 0), s: 'total período' },
                          ].map((k, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.05 }} style={{ background: 'var(--sunk)', borderRadius: 12, padding: '14px 16px' }}>
                              <div style={css('font-size:10px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--fg-3)')}>{k.l}</div>
                              <div style={css('font-family:' + DISP + '; font-size:22px; font-weight:600; margin-top:4px')}>{k.v}</div>
                              <div style={css('font-size:10px; color:var(--fg-3); margin-top:3px')}>{k.s}</div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div style={css('font-size:12px; color:var(--fg-3)')}>Carregando métricas...</div>
                      )}
                    </Panel>

                    {/* MCP Health */}
                    <Panel title="Saúde das fontes MCP" hint="conectores de dados da Athena" delay={0.25}>
                      {mcpHealth?.servers ? (
                        <div style={css('display:flex; flex-direction:column; gap:4px')}>
                          {mcpHealth.servers.map((srv: any, i: number) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }} style={css('display:flex; align-items:center; gap:14px; padding:12px 0; border-top:1px dashed var(--dash)')}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: srv.status === 'ok' ? 'var(--green)' : srv.status === 'not_configured' ? 'var(--gold)' : 'var(--red)', boxShadow: srv.status === 'ok' ? '0 0 8px rgba(63,185,80,.3)' : '0 0 8px rgba(221,0,4,.3)' }} />
                              <span style={css('font-size:13px; font-weight:600; flex:1')}>{srv.name.replace(/_/g, ' ')}</span>
                              <span style={css(`font-size:12px; color:${srv.status === 'ok' ? 'var(--green)' : srv.status === 'not_configured' ? 'var(--gold)' : 'var(--red)'}`)}>{srv.status === 'ok' ? 'Online' : srv.status === 'not_configured' ? 'Não configurado' : 'Offline'}</span>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div style={css('font-size:12px; color:var(--fg-3)')}>Carregando saúde MCP...</div>
                      )}
                    </Panel>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* DRAWER */}
      <AnimatePresence>
        {drawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawer(null)}
            style={css('position:fixed; inset:0; z-index:90; background:rgba(0,0,0,.7); backdrop-filter:blur(4px); display:flex; justify-content:flex-end')}
          >
            <motion.div
              initial={{ x: 560 }}
              animate={{ x: 0 }}
              exit={{ x: 560 }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              onClick={(e) => e.stopPropagation()}
              style={css('width:580px; max-width:100%; height:100%; background:var(--bg-surface); border-left:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden')}
            >
              <div style={css('display:flex; align-items:flex-start; gap:14px; padding:24px 26px 20px; border-bottom:1px dashed var(--dash); flex-shrink:0')}>
                <div style={css('min-width:0; flex:1')}>
                  <div style={css('font-family:' + DISP + '; font-size:18px; font-weight:600; line-height:1.3')}>{drawer.title || 'Conversa'}</div>
                  <div style={css('font-size:12px; color:var(--fg-3); margin-top:8px')}>{shortName(drawer.user_id)} · {fmtNum(drawer.message_count)} mensagens · {relativeTime(drawer.updated_at)}</div>
                </div>
                <B t="button" onClick={() => setDrawer(null)} title="Fechar" c="background:none; border:none; color:var(--fg-3); cursor:pointer; padding:4px; display:flex; flex-shrink:0" h="color:var(--fg)"><IC s={18} d='<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' w={2} /></B>
              </div>
              <div style={css('flex:1; overflow-y:auto; padding:22px 26px 36px; display:flex; flex-direction:column; gap:16px')}>
                {drawerMsgs === null && <div style={css('font-size:12.5px; color:var(--fg-3)')}>Carregando mensagens...</div>}
                {drawerMsgs?.length === 0 && <div style={css('font-size:12.5px; color:var(--fg-3)')}>Sem mensagens.</div>}
                {(drawerMsgs || []).filter((m) => m.role !== 'system_summary').map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} style={css(`display:flex; flex-direction:column; gap:6px; ${m.role === 'user' ? 'align-items:flex-end' : ''}`)}>
                    <span style={css(`font-family:${DISP}; font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:${m.role === 'user' ? 'var(--fg-3)' : 'var(--red)'}`)}>{m.role === 'user' ? 'Usuário' : 'Athena'}</span>
                    <div style={css(`max-width:92%; font-size:13px; line-height:1.65; padding:12px 15px; border-radius:12px; white-space:pre-wrap; background:${m.role === 'user' ? 'var(--sunk)' : 'transparent'}; border:1px solid var(--border); color:var(--fg)`)}>{m.content}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Empty({ msg }: { msg?: string }) {
  return <div style={css('font-size:12.5px; color:var(--fg-3); padding:28px 0; text-align:center')}>{msg || 'Sem dados ainda.'}</div>;
}
