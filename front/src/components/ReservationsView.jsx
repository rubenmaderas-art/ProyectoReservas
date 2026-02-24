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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800">Reservas</h2>
                <span className="text-sm text-slate-400">{reservations.length} reservas</span>
            </div>

            {loading ? (
                <div className="text-slate-400 text-center py-12 italic">Cargando reservas...</div>
            ) : reservations.length === 0 ? (
                <div className="text-slate-400 text-center py-12 italic">No hay reservas registradas</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 uppercase text-xs tracking-wider">
                                <th className="pb-3 pr-4">#</th>
                                <th className="pb-3 pr-4">Cliente</th>
                                <th className="pb-3 pr-4">Vehículo</th>
                                <th className="pb-3 pr-4">Fecha Inicio</th>
                                <th className="pb-3">Fecha Fin</th>
                                <th className="pb-3">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reservations.map((r) => (
                                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="py-3 pr-4 text-slate-400 font-mono">{r.id}</td>
                                    <td className="py-3 pr-4 font-mono font-medium text-slate-700">{r.username}</td>
                                    <td className="py-3 pr-4 text-slate-600">{r.model}</td>
                                    <td className="py-3 pr-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[r.status.fecha] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {formatDate(r.start_time)}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[r.status.fecha] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {formatDate(r.end_time)}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {r.status}
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

export default ReservationsView;
