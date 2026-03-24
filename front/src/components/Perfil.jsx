import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const roleLabel = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  empleado: 'Empleado',
};

const Perfil = () => {
  const navigate = useNavigate();
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  return (
    <div className="min-h-screen bg-white/90 flex flex-col items-center justify-center p-4 sm:p-8 animate-fade-in transition-colors duration-300 dark:bg-white/10">
      <div className="max-w-2xl w-full">
        <div className="glass-card-solid rounded-3xl shadow-2xl overflow-hidden">
          <div className="px-6 sm:px-8 py-6 border-b border-white/30 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Mi perfil</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-xl bg-white/30 dark:bg-white/10 text-slate-700 dark:text-slate-200 font-medium hover:bg-white/50 dark:hover:bg-white/20 border border-white/40 dark:border-white/10 transition-colors backdrop-blur-sm"
            >
              Volver
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#E5007D] dark:bg-white/20 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-pink-500/30 border-2 border-white/40">
                {(user.username?.[0] ?? 'U').toUpperCase()}
              </div>
              <div>
                <p className="text-xl font-semibold text-slate-800 dark:text-white">{user.username ?? 'Usuario'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-300">{roleLabel[user.role] ?? 'Sin rol'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/30 dark:border-white/10 bg-white/20 dark:bg-black/20 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Usuario</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.username ?? '-'}</p>
              </div>
            </div>

            {user.role === 'empleado' && (
              <div className="rounded-2xl border border-white/30 dark:border-white/10 bg-white/20 dark:bg-black/20 p-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Si necesitas cambiar datos del perfil, contacta con un administrador.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
