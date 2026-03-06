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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 sm:px-8 py-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Mi perfil</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Volver
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
                {(user.username?.[0] ?? 'U').toUpperCase()}
              </div>
              <div>
                <p className="text-xl font-semibold text-slate-800 dark:text-white">{user.username ?? 'Usuario'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{roleLabel[user.role] ?? 'Sin rol'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Usuario</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.username ?? '-'}</p>
              </div>
            </div>

            {/* Poner si solo es un empleado*/}
            {user.role === 'empleado' && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
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
