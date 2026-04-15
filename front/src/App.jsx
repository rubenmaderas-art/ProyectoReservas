import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import Perfil from './components/Perfil';
import { clearSessionStorage, getSessionTiming, ensureSessionStart, SESSION_DURATION_MS, SESSION_WARNING_MS } from './utils/session';

const sessionWarningText = 'Tu sesión está a punto de caducar. Se cerrará automáticamente en 5 minutos.';

// Este componente protege las rutas privadas
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const { isExpired } = getSessionTiming();

  if (!token || isExpired) {
    if (isExpired) {
      clearSessionStorage();
    }
    return <Navigate to="/" replace />;
  }
  return children;
};

const SessionTimeoutWatcher = () => {
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const warningDismissedRef = useRef(false);

  const evaluateSession = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      warningDismissedRef.current = false;
      setShowWarning(false);
      return;
    }

    const loginAt = ensureSessionStart();
    const expiresAt = loginAt + SESSION_DURATION_MS;
    const warningAt = expiresAt - SESSION_WARNING_MS;
    const now = Date.now();

    if (now >= expiresAt) {
      warningDismissedRef.current = false;
      setShowWarning(false);
      clearSessionStorage();
      navigate('/', { replace: true });
      return;
    }

    const shouldWarn = now >= warningAt && !warningDismissedRef.current;
    setShowWarning(shouldWarn);
  }, [navigate]);

  useEffect(() => {
    evaluateSession();

    const handleSessionChange = () => {
      warningDismissedRef.current = false;
      evaluateSession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        evaluateSession();
      }
    };

    window.addEventListener('focus', evaluateSession);
    window.addEventListener('storage', handleSessionChange);
    window.addEventListener('session-auth-changed', handleSessionChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = window.setInterval(evaluateSession, 60000);

    return () => {
      window.removeEventListener('focus', evaluateSession);
      window.removeEventListener('storage', handleSessionChange);
      window.removeEventListener('session-auth-changed', handleSessionChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [evaluateSession]);

  const handleLogoutNow = () => {
    warningDismissedRef.current = false;
    setShowWarning(false);
    clearSessionStorage();
    navigate('/', { replace: true });
  };

  const handleDismissWarning = () => {
    warningDismissedRef.current = true;
    setShowWarning(false);
  };

  if (!showWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-xl" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Tu sesión va a caducar</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {sessionWarningText}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleDismissWarning}
            className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Entendido
          </button>
          <button
            onClick={handleLogoutNow}
            className="flex-1 rounded-xl bg-[#E5007D] px-4 py-3 text-sm font-semibold text-white transition-colors hover:brightness-90"
          >
            Cerrar sesión ahora
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <SessionTimeoutWatcher />
      <Routes>
        {/* Cambiamos "/" por "/login" para que coincida con lo que manda el backend */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        {/* Rutas Protegidas */}
        <Route path="/inicio" element={<ProtectedRoute><AdminDashboard initialPage="inicio" /></ProtectedRoute>} />
        <Route path="/vehiculos" element={<ProtectedRoute><AdminDashboard initialPage="vehiculos" /></ProtectedRoute>} />
        <Route path="/reservas" element={<ProtectedRoute><AdminDashboard initialPage="reservas" /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute><AdminDashboard initialPage="usuarios" /></ProtectedRoute>} />
        <Route path="/centros" element={<ProtectedRoute><AdminDashboard initialPage="centros" /></ProtectedRoute>} />
        <Route path="/validaciones" element={<ProtectedRoute><AdminDashboard initialPage="validaciones" /></ProtectedRoute>} />
        <Route path="/auditoria" element={<ProtectedRoute><AdminDashboard initialPage="auditoria" /></ProtectedRoute>} />
        <Route path="/mi-perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />

        {/* Compatibilidad con rutas antiguas */}
        <Route path="/dashboard" element={<Navigate to="/inicio" replace />} />
        <Route path="/perfil" element={<Navigate to="/mi-perfil" replace />} />
        <Route path="/revision" element={<Navigate to="/validaciones" replace />} />
        <Route path="/audit-log" element={<Navigate to="/auditoria" replace />} />

        {/* Redirigir cualquier otra cosa al login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
