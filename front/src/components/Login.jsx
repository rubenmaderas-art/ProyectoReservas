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

    // Limpiamos errores al empezar
    setErrors({ username: '', password: '' });

    // Verificación inmediata de si está vacio
    if (!formData.username.trim()) {
      setErrors(prev => ({ ...prev, username: 'Introduce un nombre de usuario' }));
      setLoading(false);
      return; // Ni siquiera intentamos llamar al back
    }

    try {
      // Llamamos al servidor para verificar credenciales
      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // Redirigir al dashboard
        navigate('/dashboard'); 
        
      } else {
        // Manejo de errores según la respuesta del Back
        const errorMsg = data.error || '';

        if (errorMsg.includes('Usuario')) {
          // Si el back dice que el usuario no existe
          setErrors({ username: errorMsg, password: '' });
        }
        else if (!formData.password.trim()) {
          // Si el usuario existe pero la contraseña está vacía en el front
          setErrors({ username: '', password: 'La contraseña no puede estar vacía' });
        }
        else if (errorMsg.includes('Contraseña')) {
          // Si el usuario existe pero la contraseña es errónea en el back
          setErrors({ username: '', password: 'La contraseña es incorrecta' });
        }
        else {
          // Error genérico
          setErrors({ username: errorMsg, password: errorMsg });
        }
      }
    } catch (err) {
      setErrors({ username: 'Error de conexión', password: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
            Gestión de Reservas
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Usuario */}
            <div className="flex flex-col gap-1">
              <label className="block text-sm font-medium text-gray-700">Usuario</label>
              <div className="relative">
                <input
                  type="text"
                  className={`w-full px-4 py-3 rounded-lg border outline-none transition ${errors.username ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                    }`}
                  placeholder="Tu usuario"
                  // Esto se encarga de actualizar el estado del formulario cuando el usuario escribe 
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
                {errors.username && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                  </div>
                )}
              </div>
              {errors.username && <p className="text-red-500 text-xs font-semibold mt-1">{errors.username}</p>}
            </div>

            {/* Campo Password */}
            <div className="flex flex-col gap-1">
              <label className="block text-sm font-medium text-gray-700">Contraseña</label>
              <div className="relative">
                <input
                  type="password"
                  className={`w-full px-4 py-3 rounded-lg border outline-none transition ${errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                    }`}
                  placeholder="••••••••"
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                {errors.password && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                  </div>
                )}
              </div>
              {errors.password && <p className="text-red-500 text-xs font-semibold mt-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg text-white font-bold transition shadow-md ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                }`}
            >
              {loading ? 'Entrando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;