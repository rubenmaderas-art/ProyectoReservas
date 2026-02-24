import { useState, useEffect } from 'react';

const STATUS_STYLES = {
    'disponible': 'bg-green-100 text-green-700',
    'no-disponible': 'bg-red-100 text-red-700',
    'reservado': 'bg-amber-100 text-amber-700',
};

const VehiclesView = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const response = await fetch('http://localhost:4000/api/dashboard/vehicles', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await response.json();
                setVehicles(data);
            } catch (error) {
                console.error('Error cargando vehículos:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchVehicles();
    }, []);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800">Vehículos</h2>
                <span className="text-sm text-slate-400">{vehicles.length} vehículos</span>
            </div>

            {loading ? (
                <div className="text-slate-400 text-center py-12 italic">Cargando vehículos...</div>
            ) : vehicles.length === 0 ? (
                <div className="text-slate-400 text-center py-12 italic">No hay vehículos registrados</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 uppercase text-xs tracking-wider">
                                <th className="pb-3 pr-4">#</th>
                                <th className="pb-3 pr-4">Matrícula</th>
                                <th className="pb-3 pr-4">Modelo</th>
                                <th className="pb-3 pr-4">Estado</th>
                                <th className="pb-3">Kilómetros</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vehicles.map((v) => (
                                <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="py-3 pr-4 text-slate-400 font-mono">{v.id}</td>
                                    <td className="py-3 pr-4 font-mono font-medium text-slate-700">{v.license_plate}</td>
                                    <td className="py-3 pr-4 text-slate-600">{v.model}</td>
                                    <td className="py-3 pr-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[v.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {v.status}
                                        </span>
                                    </td>
                                    <td className="py-3 text-slate-600">{v.kilometers.toLocaleString('es-ES')} km</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default VehiclesView;
