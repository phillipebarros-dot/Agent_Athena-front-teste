'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';

const QUOTES = [
  'A decisão certa começa por saber de onde veio o dado.',
  'Toda resposta traz a fonte, o filtro e o recorte.',
  'Planejamento é memória organizada.',
];

const SOURCES = [
  { label: 'Publi', dot: '#dd0004' },
  { label: 'Kantar', dot: '#3fb4c4' },
  { label: 'BOP', dot: '#d9a441' },
  { label: 'Mídia digital', dot: '#3fb950' },
];

export default function LoginPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const [qi, setQi] = useState(0);
  const [fading, setFading] = useState(false);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('error');
    if (!e) return;
    const msgs: Record<string, string> = {
      oauth_indisponivel: 'Login Google ainda não configurado no servidor.',
      dominio_nao_permitido: 'Use um e-mail @grupoom.com.br ou @opusmultipla.com.br.',
      cancelado: 'Login cancelado.',
      estado_invalido: 'Sessão de login expirou, tente de novo.',
      email_nao_verificado: 'E-mail do Google não verificado.',
    };
    setErr(msgs[e] || 'Não foi possível entrar. Tente novamente.');
  }, []);

  // Login real via Google OAuth (redireciona para o consentimento).
  const signIn = () => { setBusy(true); setErr(''); window.location.href = '/api/auth/google/start'; };
  // Atalho de desenvolvimento (só funciona com ATHENA_DEV_LOGIN=true).
  const devSignIn = async () => {
    setBusy(true); setErr('');
    try {
      const r: any = await auth.login();
      if (r.ok) { router.push('/chat'); return; }
      setErr('Modo dev desativado. Em produção use o botão do Google.');
    } catch { setErr('Falha de conexão com o servidor.'); }
    setBusy(false);
  };

  // Malha reativa: pontos dispersos se conectam em torno do medalhão e o
  // olhar da Athena varre o campo em órbita.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const mouse = { x: -9999, y: -9999, on: false };
    let dots: any[] = [], cols = 74, rows = 0, src = { x: 0, y: 0 }, raf = 0, srcTick = 0;

    const build = () => {
      const r = canvas.parentElement!.getBoundingClientRect();
      canvas.width = r.width; canvas.height = r.height;
      const gap = canvas.width / cols;
      rows = Math.ceil(canvas.height / gap);
      dots = [];
      for (let ry = 0; ry < rows; ry++)
        for (let cx = 0; cx < cols; cx++) {
          const ox = cx * gap + gap / 2, oy = ry * gap + gap / 2;
          dots.push({ ox, oy, x: ox, y: oy, vx: 0, vy: 0, e: 0, ph: (cx + ry) * 0.35 });
        }
      const logo = logoRef.current;
      if (logo) {
        const lr = logo.getBoundingClientRect();
        src.x = lr.left - r.left + lr.width / 2;
        src.y = lr.top - r.top + lr.height / 2;
      } else { src.x = canvas.width / 2; src.y = canvas.height * 0.34; }
    };
    build();

    const onResize = build;
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
    };
    const onLeave = () => { mouse.on = false; mouse.x = -9999; mouse.y = -9999; };
    window.addEventListener('resize', onResize);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);

    const CLEAR = 96, HALO = 210, GAZE_R = 232, GAZE_T = 15;
    const draw = (now: number) => {
      const logo = logoRef.current;
      if (srcTick++ % 10 === 0 && logo) {
        const cr = canvas.getBoundingClientRect(), lr = logo.getBoundingClientRect();
        src.x = lr.left - cr.left + lr.width / 2;
        src.y = lr.top - cr.top + lr.height / 2;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = now / 1000;
      const gx = src.x + Math.cos(t * (Math.PI * 2 / GAZE_T)) * GAZE_R;
      const gy = src.y + Math.sin(t * (Math.PI * 2 / GAZE_T)) * GAZE_R * 0.62;

      for (const d of dots) {
        let tx = d.ox + Math.sin(t * 0.45 + d.ph) * 0.8;
        let ty = d.oy + Math.cos(t * 0.38 + d.ph) * 0.8;
        let energy = 0;
        const lx = d.ox - src.x, ly = d.oy - src.y, ld = Math.hypot(lx, ly) || 1;
        if (ld < HALO) {
          const clearF = Math.max(0, 1 - ld / CLEAR);
          tx += (lx / ld) * clearF * 46; ty += (ly / ld) * clearF * 46;
          energy += Math.exp(-Math.pow((ld - CLEAR * 1.35) / 62, 2)) * (0.34 + 0.16 * Math.sin(t * 1.1));
        }
        const ex = d.ox - gx, ey = d.oy - gy, ed = Math.hypot(ex, ey) || 1;
        if (ed < 180) energy += Math.pow(1 - ed / 180, 2) * 0.72;
        if (mouse.on) {
          const mx = d.ox - mouse.x, my = d.oy - mouse.y, md = Math.hypot(mx, my) || 1;
          if (md < 220) {
            const f = Math.pow(1 - md / 220, 2);
            tx += (mx / md) * f * 26; ty += (my / md) * f * 26; energy += f * 1.05;
          }
        }
        d.vx = (d.vx + (tx - d.x) * 0.14) * 0.76;
        d.vy = (d.vy + (ty - d.y) * 0.14) * 0.76;
        d.x += d.vx; d.y += d.vy; d.e = Math.min(1.5, energy);
      }

      ctx.lineWidth = 1.8;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        if (d.e < 0.16) continue;
        const cx = i % cols, ry = (i / cols) | 0;
        if (cx + 1 < cols) {
          const n = dots[i + 1];
          if (n.e > 0.12) {
            ctx.strokeStyle = 'rgba(220,38,38,' + Math.min(0.7, Math.min(d.e, n.e) * 0.75) + ')';
            ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(n.x, n.y); ctx.stroke();
          }
        }
        if (ry + 1 < rows) {
          const n = dots[i + cols];
          if (n && n.e > 0.12) {
            ctx.strokeStyle = 'rgba(220,38,38,' + Math.min(0.7, Math.min(d.e, n.e) * 0.75) + ')';
            ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(n.x, n.y); ctx.stroke();
          }
        }
      }
      for (const d of dots) {
        const e = d.e;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.8 + e * 3.2, 0, Math.PI * 2);
        if (e > 0.8) {
          const k = Math.min(1, (e - 0.8) / 0.7);
          ctx.fillStyle = 'rgba(' + Math.round(220 + 35 * k) + ',' + Math.round(38 + 150 * k) + ',' + Math.round(38 + 140 * k) + ',' + (0.5 + e * 0.32) + ')';
        } else {
          ctx.fillStyle = 'rgba(220,38,38,' + (0.18 + e * 0.7) + ')';
        }
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => { setQi((i) => (i + 1) % QUOTES.length); setFading(false); }, 500);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', overflow: 'hidden', fontFamily: "'Raleway',sans-serif" }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0, width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(circle at center, rgba(0,0,0,0.85) 0%, transparent 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 40%)' }} />

      <main style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2rem 2.5rem 1.5rem', width: 400, maxWidth: '92vw', animation: 'card-in .8s cubic-bezier(0.16,1,0.3,1) .2s both' }}>
        <div style={{ position: 'relative', width: 124, height: 124, marginBottom: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={logoRef} className="logo-sway" src="/athena-logo.png" alt="Athena" style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 2, transformOrigin: '50% 88%' }} />
        </div>

        <h1 style={{ fontFamily: "'Oswald',sans-serif", fontSize: '2rem', fontWeight: 700, color: '#fff', letterSpacing: 3, lineHeight: 1.1, margin: 0, animation: 'title-in .8s ease .3s both' }}>ATHENA</h1>
        <div style={{ fontSize: '1.2rem', fontWeight: 300, color: 'rgba(255,255,255,.5)', marginTop: 2, animation: 'fade-up .6s ease .5s both' }}>Bem-vindo de volta</div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(220,38,38,.5)', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 8, fontWeight: 500, animation: 'fade-up .6s ease .6s both' }}>Assistente de mídia</div>

        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, margin: '1.2rem 0', animation: 'fade-up .6s ease .7s both' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,.25)' }}>acesse com</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
        </div>

        <button
          className="google-btn"
          onClick={signIn}
          disabled={busy}
          style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', padding: '16px 22px', background: 'linear-gradient(135deg, #dd0004, #b2232a)', border: 'none', borderRadius: 999, color: '#fff', fontFamily: "'Raleway',sans-serif", fontSize: '0.95rem', fontWeight: 700, letterSpacing: '.02em', cursor: 'pointer', transition: 'transform .25s ease, box-shadow .25s ease', animation: 'fade-up .6s ease .9s both', boxShadow: '0 8px 30px rgba(221,0,4,.4)' }}
        >
          <span className="btn-sheen" aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', left: '-60%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent)', pointerEvents: 'none' }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: '#fff', flexShrink: 0 }}>
            <svg viewBox="0 0 48 48" style={{ width: 15, height: 15 }}><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
          </span>
          {busy ? 'Entrando...' : 'Entrar com Google'}
        </button>
        {err && (
          <div style={{ marginTop: 12, fontSize: '0.75rem', color: '#ff6b6b', maxWidth: 320 }}>{err}</div>
        )}
        <button onClick={devSignIn} disabled={busy} style={{ marginTop: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,.28)', fontFamily: "'Raleway',sans-serif", fontSize: '0.7rem', letterSpacing: '.04em', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>entrar em modo desenvolvimento</button>

        <div style={{ fontSize: '0.8rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.5, color: 'rgba(255,255,255,.3)', margin: '1.2rem 0 0', minHeight: 36, opacity: fading ? 0 : 1, transform: fading ? 'translateY(-4px)' : 'translateY(0)', transition: 'opacity .5s ease, transform .3s ease', animation: 'fade-up .6s ease .8s both' }}>{QUOTES[qi]}</div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: '1rem', flexWrap: 'wrap', animation: 'fade-up .6s ease 1.05s both' }}>
          {SOURCES.map((s) => (
            <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.dot }} />
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.22)' }}>{s.label}</span>
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: '1.6rem', flexWrap: 'wrap', animation: 'fade-up .6s ease 1.1s both' }}>
          {[{ s: '/partner-google.png', a: 'Google Partner' }, { s: '/partner-meta.png', a: 'Meta Business Partner' }, { s: '/partner-iso.png', a: 'ISO Certified' }].map((b) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={b.s} className="partner-badge" src={b.s} alt={b.a} style={{ height: 26, width: 'auto', objectFit: 'contain', opacity: 0.85, transition: 'opacity .3s ease, transform .3s ease' }} />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: '1.4rem', animation: 'fade-up .6s ease 1.15s both' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/grupo-om.png" alt="Grupo OM" style={{ height: 22, width: 'auto', objectFit: 'contain', opacity: 0.55 }} />
          <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,.18)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Powered by <a href="https://opusmultipla.com.br" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(221,0,4,.55)' }}>OpusMúltipla</a>
          </div>
        </div>
      </main>

      <style jsx>{`
        .google-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(221,0,4,.55); }
        .google-btn:active { transform: scale(0.98); }
        .google-btn:hover .btn-sheen { animation: sheen 0.9s ease; }
        @keyframes sheen { from { left: -60%; } to { left: 130%; } }
        .logo-sway { animation: sway 4s ease-in-out infinite; }
        .logo-ping { animation: ping 2.6s cubic-bezier(0,0,0.2,1) infinite; }
        .logo-aura { animation: auraGlow 3.6s ease-in-out infinite; }
        .partner-badge:hover { opacity: 0.85 !important; filter: grayscale(0) brightness(1) !important; }
        @keyframes sway { 0%,100% { transform: rotate(-3.5deg); } 50% { transform: rotate(3.5deg); } }
        @keyframes ping { 0% { transform: scale(.82); opacity: .7; } 70%,100% { transform: scale(1.7); opacity: 0; } }
        @keyframes fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes title-in { from { opacity: 0; transform: translateY(12px); filter: blur(4px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
        @keyframes card-in { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
