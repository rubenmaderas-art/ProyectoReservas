import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({ username: '', password: '' });

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
        setErrors({ username: '', password: 'La contrasena no puede estar vacia' });
      } else if (errorMsg.includes('Contrasena') || errorMsg.includes('Contrase')) {
        setErrors({ username: '', password: 'La contrasena es incorrecta' });
      } else {
        setErrors({ username: errorMsg, password: errorMsg });
      }
    } catch (err) {
      setErrors({ username: 'Error de conexion', password: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Iniciar sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col gap-1">
              <label className="block font-medium text-sm text-gray-700">Usuario</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.username}
                  className={`w-full rounded-lg border outline-none transition px-4 py-3 ${
                    errors.username ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                  }`}
                  placeholder="Tu usuario"
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
                {errors.username && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" />
                    </svg>
                  </div>
                )}
              </div>
              {errors.username && <p className="mt-1 text-xs font-semibold text-red-500">{errors.username}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="block font-medium text-sm text-gray-700">Contrasena</label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.password}
                  className={`w-full rounded-lg border outline-none transition px-4 py-3 ${
                    errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                  }`}
                  placeholder="********"
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                {errors.password && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" />
                    </svg>
                  </div>
                )}
              </div>
              {errors.password && <p className="mt-1 text-xs font-semibold text-red-500">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-lg py-3 font-bold text-white transition shadow-md ${
                loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
              }`}
            >
              {loading ? 'Entrando...' : 'Iniciar sesión'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/register')}
              className="w-full rounded-lg py-3 font-bold text-white transition shadow-md active:scale-[0.98] bg-blue-600 hover:bg-blue-700"
            >
              Registrarse
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
