import { useState, useEffect } from 'react';

const STATUS_STYLES = {
    'empleado': 'bg-green-100 text-green-700',
    'admin': 'bg-red-100 text-red-700',
    'supervisor': 'bg-amber-100 text-amber-700',

};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

const UsersView = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('http://localhost:4000/api/dashboard/users', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await response.json();
                setUsers(data);
            } catch (error) {
                console.error('Error cargando usuarios:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800">Usuarios</h2>
                <span className="text-sm text-slate-400">{users.length} usuarios</span>
            </div>

            {loading ? (
                <div className="text-slate-400 text-center py-12 italic">Cargando usuarios...</div>
            ) : users.length === 0 ? (
                <div className="text-slate-400 text-center py-12 italic">No hay usuarios registrados</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 uppercase text-xs tracking-wider">
                                <th className="pb-3 pr-4">#</th>
                                <th className="pb-3 pr-4">Nombre</th>
                                <th className="pb-3 pr-4">Rol</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="py-3 pr-4 text-slate-400 font-mono">{u.id}</td>
                                    <td className="py-3 pr-4 font-mono font-medium text-slate-700">{u.username}</td>
                                    <td className="py-3 pr-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default UsersView;
