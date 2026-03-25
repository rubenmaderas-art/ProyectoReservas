import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({ username: '', password: '', general: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Cuando el backend nos redirige, trae el token en la URL
  useEffect(() => {
    // Esto lee los parámetros de la URL actual
    const query = new URLSearchParams(window.location.search);
    const token = query.get('token');
    const user = query.get('user');

    if (token && user) {
      // Guardamos los datos
      localStorage.setItem('token', token);
      localStorage.setItem('user', user);
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // FUNCIÓN PARA LOGIN EXTERNO
  const handleExternalLogin = () => {
    // Redirigimos al backend a la ruta que definimos como /externo
    window.location.href = 'http://localhost:4000/api/auth/externo';
  };

  // FUNCIÓN PARA LOGIN MANUAL
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({ username: '', password: '', general: '' });

    if (!formData.username.trim()) {
      setErrors((prev) => ({ ...prev, username: 'Introduce un nombre de usuario' }));
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
        return;
      }

      const errorMsg = data.error || '';
      if (errorMsg.includes('Usuario')) {
        setErrors({ username: errorMsg, password: '' });
      } else if (!formData.password.trim()) {
        setErrors({ username: '', password: 'La contraseña no puede estar vacía' });
      } else if (errorMsg.includes('Contraseña')) {
        setErrors({ username: '', password: 'La contraseña es incorrecta' });
      } else {
        setErrors({ ...errors, general: errorMsg });
      }
    } catch (err) {
      setErrors({ ...errors, general: 'Error de conexión con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white/80 dark:bg-white/5 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-white/10">
        <div className="p-8">
          <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">Iniciar sesión</h2>

          {errors.general && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center font-semibold">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Usuario */}
            <div className="flex flex-col gap-1">
              <label className="block font-medium text-sm text-gray-700 dark:text-slate-200">Usuario</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.username}
                  className={`w-full rounded-lg border outline-none transition px-4 py-3 bg-white text-slate-900 dark:bg-black dark:text-white ${errors.username ? 'border-red-500 bg-red-50 focus:border-primary focus:ring-1 focus:ring-primary dark:focus:border-primary' : 'border-gray-300 dark:border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary dark:focus:border-primary'
                    }`}
                  placeholder="Tu usuario"
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              {errors.username && <p className="text-xs font-semibold text-red-500">{errors.username}</p>}
            </div>

            {/* Campo Contraseña */}
            <div className="flex flex-col gap-1">
              <label className="block font-medium text-sm text-gray-700 dark:text-slate-200">Contraseña</label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.password}
                  className={`w-full rounded-lg border outline-none transition px-4 py-3 bg-white text-slate-900 dark:bg-black dark:text-white ${errors.password ? 'border-red-500 bg-red-50 focus:border-primary focus:ring-1 focus:ring-primary dark:focus:border-primary' : 'border-gray-300 dark:border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary dark:focus:border-primary'
                    }`}
                  placeholder="********"
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              {errors.password && <p className="text-xs font-semibold text-red-500">{errors.password}</p>}
            </div>

            {/* Botón Login Manual */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-lg py-3 font-bold text-white transition shadow-md ${loading ? 'bg-primary/60' : 'bg-primary hover:brightness-90 active:scale-[0.98]'
                }`}
            >
              {loading ? 'Entrando...' : 'Iniciar sesión'}
            </button>

            {/* Separador Visual */}
            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-gray-400 dark:bg-slate-700"></div>
              <span className="px-3 text-xs text-gray-500 uppercase">o también</span>
              <div className="flex-1 h-px bg-gray-400 dark:bg-slate-700"></div>
            </div>

            {/* BOTÓN LOGIN EXTERNO (MICROSOFT) */}
            <button
              type="button"
              onClick={handleExternalLogin}
              className="w-full flex items-center justify-center gap-3 rounded-lg py-3 px-4 font-bold transition-all duration-300 active:scale-[0.95] shadow-lg
              bg-white/20 text-gray-700 border border-white/30 hover:bg-white/100 hover:border-white/20 backdrop-blur-sm
              dark:bg-black/5 dark:hover:bg-black/40
              dark:backdrop-blur-md dark:border dark:border-white/10 dark:text-white
              dark:hover:border-white/20"
            >
              <svg width="20" height="20" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              Entrar con Microsoft 365
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;