import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSessionStorage, ensureSessionStart, SESSION_DURATION_MS, SESSION_WARNING_MS } from '../utils/session';

const SESSION_WARNING_TEXT = 'Tu sesión está a punto de caducar. Se cerrará automáticamente en 5 minutos.';

export default function SessionTimeoutWatcher() {
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const warningDismissedRef = useRef(false);

  const evaluateSession = useCallback(() => {
    const hasUser = Boolean(localStorage.getItem('user'));
    if (!hasUser) {
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
      navigate('/login?error=session_expired', { replace: true });
      return;
    }

    setShowWarning(now >= warningAt && !warningDismissedRef.current);
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

    const handleForceLogout = () => {
      warningDismissedRef.current = false;
      setShowWarning(false);
      clearSessionStorage();
      navigate('/login?error=session_expired', { replace: true });
    };

    window.addEventListener('focus', evaluateSession);
    window.addEventListener('storage', handleSessionChange);
    window.addEventListener('session-auth-changed', handleSessionChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('force-logout', handleForceLogout);

    const intervalId = window.setInterval(evaluateSession, 60000);

    return () => {
      window.removeEventListener('focus', evaluateSession);
      window.removeEventListener('storage', handleSessionChange);
      window.removeEventListener('session-auth-changed', handleSessionChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('force-logout', handleForceLogout);
      window.clearInterval(intervalId);
    };
  }, [evaluateSession, navigate]);

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
          {SESSION_WARNING_TEXT}
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
}
