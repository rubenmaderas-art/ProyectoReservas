import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { persistSession } from '../utils/session';
import macrosadLogo from '../assets/isotipo-petalos.svg';
import WaveCanvas from '../components/WaveCanvas.jsx';
import HeroLogo from '../components/HeroLogo.jsx';

const PINK = '#E5007D';

// ── Icono Microsoft ───────────────────────────────────────────────
const MSIcon = () => (
  <svg width="18" height="18" viewBox="0 0 21 21" style={{ flexShrink: 0 }}>
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

// ── Icono ojo ─────────────────────────────────────────────────────
const EyeIcon = ({ open }) =>
  open ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : ( 
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

// ── Tarjetas de proceso ───────────────────────────────────────────
const PROCESS_STEPS = [
  { n: '1', title: 'Solicitud',  text: 'Indica la fecha, hora de salida, destino y el vehículo disponible en tu centro.' },
  { n: '2', title: 'Validación', text: 'El responsable de flota revisa la solicitud y confirma la asignación del vehículo.' },
  { n: '3', title: 'Recogida',   text: 'El vehículo queda reservado a tu nombre. Recógelo en el punto habitual de tu centro.' },
];

const ProcessCards = ({ dark }) => (
  <div style={{ display: 'flex', gap: 12 }}>
    {PROCESS_STEPS.map(({ n, title, text }) => (
      <div
        key={n}
        style={{
          flex: 1, borderRadius: 14,
          border: `1px solid ${dark ? 'rgba(255,255,255,.07)' : '#efefef'}`,
          padding: '14px',
          background: dark ? 'rgba(255,255,255,.03)' : '#fff',
          boxShadow: dark ? 'none' : '0 1px 4px rgba(15,23,42,.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
            background: dark ? 'rgba(229,0,125,.18)' : 'rgba(229,0,125,.1)',
            border: '1px solid rgba(229,0,125,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: PINK,
          }}>{n}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: dark ? '#e2e8f0' : '#0f172a' }}>{title}</span>
        </div>
        <p style={{ fontSize: 11, color: dark ? '#475569' : '#94a3b8', lineHeight: 1.6 }}>{text}</p>
      </div>
    ))}
  </div>
);

// ── Login principal ───────────────────────────────────────────────
function Login() {
  const [formData, setFormData]   = useState({ username: '', password: '' });
  const [errors, setErrors]       = useState({ username: '', password: '', general: '' });
  const [loading, setLoading]     = useState(false);
  const [showPwd, setShowPwd]     = useState(false);
  const navigate = useNavigate();

  // Dimensiones del panel izquierdo para el canvas de olas
  const wrapRef    = useRef(null);
  const mouseRef   = useRef({ x: 0.5, y: 0.5 });
  const targetRef  = useRef({ x: 0.5, y: 0.5 });
  const frameRef   = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  // Medir el contenedor al montar y al redimensionar
  useEffect(() => {
    const update = () => {
      if (!wrapRef.current) return;
      setDims({ w: wrapRef.current.offsetWidth, h: wrapRef.current.offsetHeight });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Seguimiento suavizado del ratón
  useEffect(() => {
    const tick = () => {
      mouseRef.current.x += (targetRef.current.x - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (targetRef.current.y - mouseRef.current.y) * 0.06;
      frameRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    targetRef.current = {
      x: (e.clientX - rect.left)  / rect.width,
      y: (e.clientY - rect.top)   / rect.height,
    };
  }, []);

  // ── Leer token de la URL (login externo) ─────────────────────
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const token = query.get('token');
    const user  = query.get('user');
    if (token && user) {
      try {
        const parsedUser = JSON.parse(user);
        persistSession({ token, user, centres: parsedUser.centres || [] });
      } catch {
        persistSession({ token, user, centres: [] });
      }
      window.dispatchEvent(new Event('session-auth-changed'));
      navigate('/inicio', { replace: true });
    }
  }, [navigate]);

  const handleExternalLogin = () => {
    window.location.href = '/api/auth/externo';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({ username: '', password: '', general: '' });

    if (!formData.username.trim()) {
      setErrors((p) => ({ ...p, username: 'Introduce un nombre de usuario' }));
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (response.ok && data.token) {
        persistSession({ token: data.token, user: data.user, centres: data.user?.centres || [] });
        window.dispatchEvent(new Event('session-auth-changed'));
        navigate('/inicio');
        return;
      }

      const errorMsg = data.error || '';
      if (errorMsg.includes('Usuario')) {
        setErrors({ username: errorMsg, password: '', general: '' });
      } else if (!formData.password.trim()) {
        setErrors({ username: '', password: 'La contraseña no puede estar vacía', general: '' });
      } else if (errorMsg.includes('Contraseña')) {
        setErrors({ username: '', password: 'La contraseña es incorrecta', general: '' });
      } else {
        setErrors({ username: '', password: '', general: errorMsg });
      }
    } catch {
      setErrors({ username: '', password: '', general: 'Error de conexión con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  const inputBase = {
    width: '100%', borderRadius: 14, padding: '12px 16px', fontSize: 15,
    color: '#0f172a', outline: 'none', fontFamily: 'inherit',
    transition: 'border-color .2s, box-shadow .2s',
    background: '#fff',
  };

  return (
    <div
      ref={wrapRef}
      onMouseMove={handleMouseMove}
      style={{
        minHeight: 'calc(100vh / 1.25)', // compensa el zoom para no tener scroll
        background: '#f8f9fb',
        display: 'flex', position: 'relative', overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        zoom: 1.25,
      }}
    >
      {/* ── Fondo de olas ── */}
      {dims.w > 0 && (
        <WaveCanvas width={dims.w} height={dims.h} dark={false} mouseRef={mouseRef} />
      )}

      {/* ── Dot grid ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        opacity: .28,
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      {/* PANEL IZQUIERDO — hero */}
      <div style={{
        flex: '0 0 52%', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '52px 56px',
        position: 'relative', zIndex: 1,
        borderRight: '1px solid #efefef',
      }}>
        {/* Logo + nombre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: '#fff',
            boxShadow: '0 2px 16px rgba(229,0,125,.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={macrosadLogo} alt="Macrosad" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.24em', color: PINK, textTransform: 'uppercase' }}>Macrosad</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 1 }}>Reserva de vehículos de empresa</div>
          </div>
        </div>

        {/* Titular */}
        <div>
          <h2 style={{
            fontSize: 50, fontWeight: 800, color: '#0f172a',
            lineHeight: 1.08, letterSpacing: '-.03em', marginBottom: 18,
            textWrap: 'pretty',
          }}>
            Tu próximo viaje<br />de empresa.
          </h2>
          <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.75, maxWidth: 390 }}>
            Consulta la disponibilidad de vehículos, tramita tu reserva y recibe
            la confirmación sin depender de nadie más.
          </p>
        </div>

        {/* HeroLogo + tarjetas */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
            <HeroLogo dark={false} size={220} />
          </div>
          <ProcessCards dark={false} />
        </div>
      </div>

      {/* PANEL DERECHO — formulario */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '52px 48px', position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: '100%', maxWidth: 380,
          background: '#fff', border: '1px solid #f1f5f9', borderRadius: 28,
          padding: '40px 36px', boxShadow: '0 24px 64px rgba(15,23,42,.08)',
        }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-.02em' }}>
              Accede a tu cuenta
            </h2>
            <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 8, lineHeight: 1.6 }}>
              Usa tus credenciales corporativas para gestionar tus reservas.
            </p>
          </div>

          {/* Error general */}
          {errors.general && (
            <div style={{
              marginBottom: 16, borderRadius: 14, border: '1px solid #fecaca',
              background: '#fef2f2', padding: '12px 16px',
              fontSize: 14, fontWeight: 500, color: '#dc2626',
            }}>
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Microsoft 365 — método principal */}
            <button
              type="button"
              onClick={handleExternalLogin}
              style={{
                width: '100%', borderRadius: 14, border: '1.5px solid #e2e8f0',
                background: '#fff', color: '#334155', fontWeight: 700, fontSize: 15,
                padding: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 10, fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(15,23,42,.06)',
                transition: 'border-color .2s, background .2s',
              }}
            >
              <MSIcon /> Continuar con Microsoft 365
            </button>

            {/* Separador */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: '#94a3b8', whiteSpace: 'nowrap',
              }}>
                o con usuario
              </span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>

            {/* Usuario */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }}>
                Usuario
              </label>
              <input
                type="text"
                autoFocus
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Tu usuario corporativo"
                style={{
                  ...inputBase,
                  border: `1.5px solid ${errors.username ? '#f87171' : '#e2e8f0'}`,
                }}
              />
              {errors.username && (
                <p style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginTop: 5 }}>
                  {errors.username}
                </p>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  style={{
                    ...inputBase,
                    paddingRight: 44,
                    border: `1.5px solid ${errors.password ? '#f87171' : '#e2e8f0'}`,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#94a3b8', padding: 0, display: 'flex',
                  }}
                >
                  <EyeIcon open={showPwd} />
                </button>
              </div>
              {errors.password && (
                <p style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginTop: 5 }}>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Botón principal */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', borderRadius: 14,
                background: loading ? '#f9a8d4' : PINK,
                color: '#fff', fontWeight: 700, fontSize: 15,
                padding: '14px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                boxShadow: `0 8px 24px ${PINK}40`,
                transition: 'filter .15s, transform .1s',
              }}
            >
              {loading ? 'Entrando…' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
