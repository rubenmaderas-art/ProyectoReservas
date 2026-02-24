import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleLeft, faAngleRight, faDoorClosed } from '@fortawesome/free-solid-svg-icons';
import { faHouse, faCalendarCheck, faFile, faUser } from '@fortawesome/free-regular-svg-icons';
import car from '../assets/car.svg';
import VehiclesView from './VehiclesView';

// ── Helpers ──
const STATUS_RESERVATION = {
  aprobada: 'bg-green-100 text-green-700',
  pendiente: 'bg-amber-100 text-amber-700',
  rechazada: 'bg-red-100 text-red-700',
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ── Vista Inicio ──
const HomeView = ({ stats, reservations, loading }) => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatCard title="Total de vehículos" value={stats.totalVehiculos} color="blue-500" icon={<img src={car} alt="Car" className="w-7 h-7" />} />
      <StatCard title="Reservas activas" value={stats.reservasActivas} color="green-500" icon={<FontAwesomeIcon icon={faCalendarCheck} />} />
      <StatCard title="Documentos pendientes" value={stats.alertasDocumentos} color="amber-500" icon={<FontAwesomeIcon icon={faFile} />} />
    </div>

    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4">Últimas Reservas</h2>

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
                <th className="pb-3 pr-4">Usuario</th>
                <th className="pb-3 pr-4">Vehículo</th>
                <th className="pb-3 pr-4">Matrícula</th>
                <th className="pb-3 pr-4">Inicio</th>
                <th className="pb-3 pr-4">Fin</th>
                <th className="pb-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 pr-4 text-slate-400 font-mono">{r.id}</td>
                  <td className="py-3 pr-4 font-medium text-slate-700">{r.username}</td>
                  <td className="py-3 pr-4 text-slate-600">{r.model}</td>
                  <td className="py-3 pr-4 font-mono text-slate-500">{r.license_plate}</td>
                  <td className="py-3 pr-4 text-slate-600">{formatDate(r.start_time)}</td>
                  <td className="py-3 pr-4 text-slate-600">{formatDate(r.end_time)}</td>
                  <td className="py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_RESERVATION[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
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
  </>
);

// ── Vista placeholder ──
const ComingSoon = ({ title }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center min-h-[300px] gap-3">
    <p className="text-slate-500 text-lg font-medium">{title} — próximamente</p>
  </div>
);

// ── StatCard ──
const StatCard = ({ title, value, color, icon }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className="text-3xl font-bold text-slate-800 mt-1">{value}</h3>
    </div>
    <div className={`text-${color} w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-${color}/10`}>
      {icon}
    </div>
  </div>
);

// ── PAGE TITLES ──
const PAGE_TITLES = {
  inicio: 'Resumen del Sistema',
  vehiculos: 'Vehículos',
  reservas: 'Reservas',
  usuarios: 'Usuarios',
};

// ── AdminDashboard ──
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState('inicio');

  const [stats, setStats] = useState({ totalVehiculos: 0, reservasActivas: 0, alertasDocumentos: 0 });
  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(true);

  useEffect(() => {
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

    fetch('http://localhost:4000/api/dashboard/stats', { headers })
      .then(r => r.json()).then(setStats)
      .catch(e => console.error('Error stats:', e));

    fetch('http://localhost:4000/api/dashboard/reservations', { headers })
      .then(r => r.json()).then(setReservations)
      .catch(e => console.error('Error reservas:', e))
      .finally(() => setLoadingReservations(false));
  }, []);

  const menuItems = [
    { key: 'inicio', name: 'Inicio', icon: <FontAwesomeIcon icon={faHouse} /> },
    {
      key: 'vehiculos', name: 'Vehículos',
      icon: (
        <img src={car} alt="Car" className="w-5 h-5"
          style={{ filter: 'invert(72%) sepia(17%) saturate(452%) hue-rotate(176deg) brightness(92%) contrast(89%)' }}
        />
      )
    },
    { key: 'reservas', name: 'Reservas', icon: <FontAwesomeIcon icon={faCalendarCheck} /> },
    { key: 'usuarios', name: 'Usuarios', icon: <FontAwesomeIcon icon={faUser} /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/', { replace: true });
  };

  const renderContent = () => {
    switch (activePage) {
      case 'inicio': return <HomeView stats={stats} reservations={reservations} loading={loadingReservations} />;
      case 'vehiculos': return <VehiclesView />;
      case 'reservas': return <ComingSoon title="Reservas" />;
      case 'usuarios': return <ComingSoon title="Usuarios" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">

      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 transition-all duration-300 flex flex-col shadow-xl flex-shrink-0`}>
        <div className="p-6 text-white font-bold text-xl border-b border-slate-800 flex items-center gap-4">
          <span className="bg-blue-600 p-2 rounded-lg text-sm flex-shrink-0">img</span>
          {sidebarOpen && <span>Panel de Admin</span>}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActivePage(item.key)}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-colors
                ${activePage === item.key
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="font-medium">{item.name}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition"
          >
            <span className="flex-shrink-0"><FontAwesomeIcon icon={faDoorClosed} /></span>
            {sidebarOpen && <span className="font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* NAVBAR SUPERIOR */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg">
            {sidebarOpen ? <FontAwesomeIcon icon={faAngleLeft} /> : <FontAwesomeIcon icon={faAngleRight} />}
          </button>

          <div className="flex items-center gap-4">
            <p className="text-sm font-bold text-slate-800">Administrador</p>
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              A
            </div>
          </div>
        </header>

        {/* ÁREA DE TRABAJO */}
        <section className="p-8 overflow-y-auto flex-1">
          <h1 className="text-2xl font-bold text-slate-800 mb-6">{PAGE_TITLES[activePage]}</h1>
          {renderContent()}
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;