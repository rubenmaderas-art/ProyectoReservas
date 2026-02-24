import { useState, useEffect } from 'react';

const STATUS_STYLES = {
    'aprobada': 'bg-green-100 text-green-700',
    'rechazada': 'bg-red-100 text-red-700',
    'pendiente': 'bg-amber-100 text-amber-700',
    'fecha': 'bg-slate-100 text-slate-600',
};

const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

const ReservationsView = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
        fetchReservations();
    }, []);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800">Reservas</h2>
                <div className="flex items-center gap-2">
                    <button
                        className="text-slate-500 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50 font-medium text-sm flex items-center"
                        title="Añadir reserva" >
                        <span className="text-xl mr-1">+</span> Agregar reserva
                    </button>
                    <span className="text-sm font-medium px-3 py-1 bg-slate-100 text-slate-500 rounded-lg">
                        {reservations.length} reservas
                    </span>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                    <p className="italic">Cargando reservas...</p>
                </div>
            ) : reservations.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <div className="text-slate-300 text-5xl mb-4">📅</div>
                    <p className="text-slate-500 font-medium">No hay reservas registradas</p>
                    <p className="text-slate-400 text-sm mt-1">Las reservas aparecerán aquí una vez creadas.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 uppercase text-xs tracking-wider">
                                <th className="pb-3 px-4 text-center">#</th>
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
                                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-all duration-200">
                                    <td className="py-3 px-4 text-center text-slate-400 font-mono">{r.id}</td>
                                    <td className="py-3 px-4 text-center font-medium text-slate-700">{r.username}</td>
                                    <td className="py-3 px-4 text-center text-slate-600">{r.model}</td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[r.status.fecha] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {formatDate(r.start_time)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[r.status.fecha] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {formatDate(r.end_time)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {r.status}
                                        </span>
                                    </td>

                                    {/* Botones de opciones (editar y eliminar)*/}
                                    <td className="py-3 px-4 text-center ">
                                        <button className="text-slate-400 hover:text-yellow-600 transition-colors mr-3 p-1 rounded-lg hover:bg-yellow-50" title="Editar">
                                            <svg
                                                className="w-5 h-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                xmlns="http://www.w3.org/2000/svg">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>

                                        <button className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50" title="Eliminar">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
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

export default ReservationsView;
