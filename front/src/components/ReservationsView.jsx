import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const INITIAL_FORM_STATE = { user_id: '', vehicle_id: '', start_time: '', end_time: '', status: 'pendiente' };

const STATUS_STYLES = {
    'aprobada': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'rechazada': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'pendiente': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'fecha': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function ReservationsView() {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [editingId, setEditingId] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');
    const [deleteId, setDeleteId] = useState(null);

    // Select Options State
    const [usersList, setUsersList] = useState([]);
    const [vehiclesList, setVehiclesList] = useState([]);

    const fetchReservations = async () => {
        try {
            const response = await fetch('http://localhost:4000/api/dashboard/reservations', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            setReservations(data);
        } catch (error) {
            console.error('Error cargando reservas:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const [usersRes, vehiclesRes] = await Promise.all([
                fetch('http://localhost:4000/api/dashboard/users', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
                fetch('http://localhost:4000/api/dashboard/vehicles', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
            ]);
            const usersData = await usersRes.json();
            const vehiclesData = await vehiclesRes.json();
            setUsersList(usersData);
            setVehiclesList(vehiclesData); // Mostramos todos los vehículos en el select
        } catch (error) {
            console.error('Error cargando opciones:', error);
        }
    };

    useEffect(() => {
        fetchReservations();
        fetchOptions();
    }, []);

    const handleOpenModal = (reservation = null) => {
        setError('');
        if (reservation) {
            const start = new Date(reservation.start_time).toISOString().slice(0, 16);
            const end = new Date(reservation.end_time).toISOString().slice(0, 16);
            setFormData({ user_id: reservation.user_id, vehicle_id: reservation.vehicle_id, start_time: start, end_time: end, status: reservation.status });
            setEditingId(reservation.id);
        } else {
            setFormData(INITIAL_FORM_STATE);
            setEditingId(null);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData(INITIAL_FORM_STATE);
        setEditingId(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setError('');

        const isEditing = !!editingId;
        const url = isEditing
            ? `http://localhost:4000/api/dashboard/reservations/${editingId}`
            : 'http://localhost:4000/api/dashboard/reservations';

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
                throw new Error(data.error || 'Error al guardar la reserva');
            }

            await fetchReservations();
            handleCloseModal();
            toast.success(isEditing ? '¡Reserva actualizada!' : '¡Reserva creada!');
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

        const deletePromise = fetch(`http://localhost:4000/api/dashboard/reservations/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        toast.promise(deletePromise, {
            loading: 'Eliminando...',
            success: () => {
                setReservations(reservations.filter(r => r.id !== id));
                return 'Reserva eliminada';
            },
            error: 'Error al eliminar la reserva',
        });
    };

    return (
        <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6 animate-fade-in transition-colors">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Reservas</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleOpenModal()}
                        className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium text-sm flex items-center"
                        title="Añadir reserva" >
                        <span className="text-xl mr-1">+</span> Agregar reserva
                    </button>
                    <span className="text-sm font-medium px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg">
                        {reservations.length} reservas
                    </span>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                    <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin mb-4"></div>
                    <p className="italic">Cargando reservas...</p>
                </div>
            ) : reservations.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No hay reservas registradas</p>
                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Las reservas aparecerán aquí una vez creadas.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">
                                <th className="pb-3 px-4 text-center">Cliente</th>
                                <th className="pb-3 px-4 text-center">Vehículo</th>
                                <th className="pb-3 px-4 text-center">Fecha Inicio</th>
                                <th className="pb-3 px-4 text-center">Fecha Fin</th>
                                <th className="pb-3 px-4 text-center">Estado</th>
                                <th className="pb-3 px-4 text-center">Opciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reservations.map((r) => (
                                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all duration-200">
                                    <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-200">{r.username}</td>
                                    <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{r.model}</td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[r.status.fecha] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                            {formatDate(r.start_time)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[r.status.fecha] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                            {formatDate(r.end_time)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                            {r.status}
                                        </span>
                                    </td>

                                    {/* Botones de opciones (editar y eliminar)*/}
                                    <td className="py-3 px-4 text-center ">
                                        <button
                                            onClick={() => handleOpenModal(r)}
                                            className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors mr-1"
                                            title="Editar reserva"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>

                                        <button
                                            onClick={() => handleDeleteClick(r.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Eliminar reserva"
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

            {/* MODAL CREADO/EDICIÓN */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-500/20 dark:bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] transform transition-all">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800/50 shrink-0">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {editingId ? 'Editar Reserva' : 'Añadir Nueva Reserva'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto form-scrollbar">
                            {error && (
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800/50">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Usuario</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={formData.user_id}
                                        onChange={e => setFormData({ ...formData, user_id: e.target.value })}
                                    >
                                        <option value="" disabled>Seleccionar usuario...</option>
                                        {usersList.map(u => (
                                            <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vehículo</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={formData.vehicle_id}
                                        onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}
                                    >
                                        <option value="" disabled>Seleccionar vehículo...</option>
                                        {vehiclesList.map(v => (
                                            <option key={v.id} value={v.id}>{v.license_plate} - {v.model}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Inicio</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={formData.start_time}
                                        onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Fin</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={formData.end_time}
                                        onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                                <select
                                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="aprobada">Aprobada</option>
                                    <option value="rechazada">Rechazada</option>
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
                                        editingId ? 'Guardar Cambios' : 'Crear Reserva'
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
                            Esta acción eliminará la reserva permanentemente y no se puede deshacer.
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
}
