import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function Register() {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        role: 'empleado'
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        // Validaciones básicas en el front
        const newErrors = {};
        if (!formData.username.trim()) newErrors.username = 'El usuario es obligatorio';
        if (!formData.password) newErrors.password = 'La contraseña es obligatoria';
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Las contraseñas no coinciden';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:4000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password,
                    role: formData.role
                })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('¡Registro completado! Ahora puedes iniciar sesión.');
                navigate('/');
            } else {
                setErrors({ general: data.error || 'Error en el registro' });
                if (data.error && data.error.includes('usuario')) {
                    setErrors(prev => ({ ...prev, username: data.error }));
                }
            }
        } catch (err) {
            setErrors({ general: 'Error de conexión con el servidor' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-8">
                    <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
                        Registro de Usuario
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {errors.general && (
                            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm border border-red-200">
                                {errors.general}
                            </div>
                        )}

                        {/* Campo Usuario */}
                        <div className="flex flex-col gap-1">
                            <label className="block text-sm font-medium text-gray-700">Usuario</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className={`w-full px-4 py-3 rounded-lg border outline-none transition ${errors.username ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                                        }`}
                                    placeholder="Elige un nombre de usuario"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
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
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            {errors.password && <p className="text-red-500 text-xs font-semibold mt-1">{errors.password}</p>}
                        </div>

                        {/* Campo Confirmar Password */}
                        <div className="flex flex-col gap-1">
                            <label className="block text-sm font-medium text-gray-700">Confirmar Contraseña</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    className={`w-full px-4 py-3 rounded-lg border outline-none transition ${errors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                                        }`}
                                    placeholder="Repite tu contraseña"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                />
                            </div>
                            {errors.confirmPassword && <p className="text-red-500 text-xs font-semibold mt-1">{errors.confirmPassword}</p>}
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3 rounded-lg text-white font-bold transition shadow-md ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                                    }`}
                            >
                                {loading ? 'Registrando...' : 'Crear Cuenta'}
                            </button>
                        </div>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition"
                            >
                                ¿Ya tienes cuenta? Inicia sesión
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Register;
