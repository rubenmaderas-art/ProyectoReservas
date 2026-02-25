import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const INITIAL_FORM_STATE = { username: '', password: '', role: 'empleado' };

const STATUS_STYLES = {
    'empleado': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'admin': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'supervisor': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

const UsersView = ({ onModalChange }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [editingId, setEditingId] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');
    const [deleteId, setDeleteId] = useState(null); // Added deleteId state

    const fetchUsers = async () => {
        try {
            const response = await fetch('http://localhost:4000/api/dashboard/users', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')} ` }
            });
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            console.error('Error cargando usuarios:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpenModal = (user = null) => {
        setError('');
        if (user) {
            setFormData({ username: user.username, password: '', role: user.role });
            setEditingId(user.id);
        } else {
            setFormData(INITIAL_FORM_STATE);
            setEditingId(null);
        }
        setIsModalOpen(true);
        onModalChange?.(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData(INITIAL_FORM_STATE);
        setEditingId(null);
        onModalChange?.(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setError('');

        const isEditing = !!editingId;
        const url = isEditing
            ? `http://localhost:4000/api/dashboard/users/${editingId}`
            : 'http://localhost:4000/api/dashboard/users';

        // El password es obligatorio solo si estamos creando
        if (!isEditing && !formData.password) {
            setError('La contraseña es obligatoria para nuevos usuarios');
            setFormLoading(false);
            return;
        }

        try {
            const response = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al guardar el usuario');
            }

            await fetchUsers();
            handleCloseModal();
            toast.success(isEditing ? '¡Usuario actualizado!' : '¡Usuario creado!');
        } catch (err) {
            setError(err.message);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteClick = (id) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        const id = deleteId;
        setDeleteId(null);

        const deletePromise = fetch(`http://localhost:4000/api/dashboard/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        toast.promise(deletePromise, {
            loading: 'Eliminando...',
            success: () => {
                setUsers(users.filter(u => u.id !== id));
                return 'Usuario eliminado';
            },
            error: 'Error al eliminar el usuario',
        });
    };

    return (
        <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6 animate-fade-in transition-colors">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Usuarios</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleOpenModal()}
                        className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium text-sm flex items-center"
                        title="Añadir usuario" >
                        <span className="text-xl mr-1">+</span> Agregar usuario
                    </button>
                    <span className="text-sm font-medium px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg">
                        {users.length} usuarios
                    </span>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                    <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin mb-4"></div>
                    <p className="italic">Cargando usuarios...</p>
                </div>
            ) : users.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No hay usuarios registrados</p>
                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Los usuarios aparecerán aquí una vez registrados.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">
                                <th className="pb-3 px-4 text-center">Nombre</th>
                                <th className="pb-3 px-4 text-center">Rol</th>
                                <th className="pb-3 px-4 text-center">Opciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all duration-200">
                                    <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-200">{u.username}</td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    {/* Botones de opciones (editar y eliminar)*/}
                                    <td className="py-3 px-4 text-center ">
                                        <button
                                            onClick={() => handleOpenModal(u)}
                                            className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors mr-1"
                                            title="Editar usuario"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>

                                        <button
                                            onClick={() => handleDeleteClick(u.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Eliminar usuario"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </td>


                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-500/20 dark:bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800/50">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {editingId ? 'Editar Usuario' : 'Añadir Nuevo Usuario'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800/50">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre de Usuario</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="ej. Usuario123"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Contraseña {editingId && <span className="text-xs text-slate-400 font-normal">(dejar en blanco para no cambiar)</span>}
                                </label>
                                <input
                                    type="password"
                                    required={!editingId}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rol</label>
                                <select
                                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="empleado">Empleado</option>
                                    <option value="supervisor">Supervisor</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium shadow-sm shadow-blue-500/30 disabled:opacity-70 flex justify-center items-center"
                                >
                                    {formLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        editingId ? 'Guardar Cambios' : 'Añadir'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Eliminación */}
            {deleteId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
                        onClick={() => setDeleteId(null)}
                    />
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full relative z-10 shadow-2xl animate-scale-in border border-slate-200 dark:border-slate-700">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-center text-slate-800 dark:text-white mb-2">¿Estás seguro?</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
                            Esta acción eliminará al usuario permanentemente y no se puede deshacer.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                            >
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersView;
