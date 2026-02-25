import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleLeft, faAngleRight, faDoorClosed, faHouse, faMoon, faSun, faCar } from '@fortawesome/free-solid-svg-icons';
import { faCalendarCheck, faFile, faUser } from '@fortawesome/free-regular-svg-icons';
import macrosadLogo from '../assets/Macrosad.png';
import VehiclesView from './VehiclesView';
import ReservationsView from './ReservationsView';
import UsersView from './UsersView';

// ── Helpers ──
const STATUS_RESERVATION = {
  aprobada: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pendiente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  rechazada: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  fecha: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ── Vista Inicio ──
const HomeView = ({ stats, reservations, loading }) => (
  <div className="animate-fade-in space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard title="Total de vehículos" value={stats.totalVehiculos} color="blue-500" icon={<FontAwesomeIcon icon={faCar} />} />
      <StatCard title="Reservas activas" value={stats.reservasActivas} color="green-500" icon={<FontAwesomeIcon icon={faCalendarCheck} />} />
      <StatCard title="Documentos pendientes" value={stats.alertasDocumentos} color="amber-500" icon={<FontAwesomeIcon icon={faFile} />} />
    </div>

    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6 transition-all hover:shadow-md">
      <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Últimas Reservas</h2>

      {loading ? (
        <div className="text-slate-400 text-center py-12 italic">Cargando reservas...</div>
      ) : reservations.length === 0 ? (
        <div className="text-slate-400 text-center py-12 italic">No hay reservas registradas</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">
                <th className="pb-3 px-4 text-center">#</th>
                <th className="pb-3 px-4 text-center">Usuario</th>
                <th className="pb-3 px-4 text-center">Vehículo</th>
                <th className="pb-3 px-4 text-center">Matrícula</th>
                <th className="pb-3 px-4 text-center">Inicio</th>
                <th className="pb-3 px-4 text-center">Fin</th>
                <th className="pb-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="py-3 px-4 text-center text-slate-400 dark:text-slate-500 font-mono">{r.id}</td>
                  <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-200">{r.username}</td>
                  <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{r.model}</td>
                  <td className="py-3 px-4 text-center font-mono text-slate-500">{r.license_plate}</td>


                  <td className="py-3 px-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_RESERVATION[r.status.fecha] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                      {formatDate(r.start_time)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_RESERVATION[r.status.fecha] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                      {formatDate(r.end_time)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_RESERVATION[r.status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
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
  </div>
);

// ── StatCard ──
const STAT_COLORS = {
  'blue-500': { text: 'text-blue-500', bg: 'bg-blue-500/10' },
  'green-500': { text: 'text-green-500', bg: 'bg-green-500/10' },
  'amber-500': { text: 'text-amber-500', bg: 'bg-amber-500/10' },
  'red-500': { text: 'text-red-500', bg: 'bg-red-500/10' },
};

const StatCard = ({ title, value, color, icon }) => {
  const { text, bg } = STAT_COLORS[color] ?? { text: 'text-slate-500', bg: 'bg-slate-500/10' };
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-md group">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{value}</h3>
      </div>
      <div className={`${text} ${bg} w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 group-hover:scale-110 shadow-inner`}>
        {icon}
      </div>
    </div>
  );
};

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
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState('inicio');

  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [stats, setStats] = useState({ totalVehiculos: 0, reservasActivas: 0, alertasDocumentos: 0 });
  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(true);

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;

    if (darkMode) {
      root.classList.add('dark');
      body.classList.add('dark');
      root.style.colorScheme = 'dark';
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      root.style.colorScheme = 'light';
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

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
    { key: 'vehiculos', name: 'Vehículos', icon: <FontAwesomeIcon icon={faCar} /> },
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
      case 'reservas': return <ReservationsView />;
      case 'usuarios': return <UsersView />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 flex transition-colors duration-300">

      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-slate-900 transition-all duration-300 flex flex-col shadow-xl border-r border-slate-200 dark:border-slate-800 flex-shrink-0`}>
        <div className="p-6 text-slate-800 dark:text-white font-bold text-xl border-b border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <span className="bg-[#E3167F] p-2 rounded-lg text-sm flex-shrink-0"><img src={macrosadLogo} alt="Macrosad" className="w-8 h-8 object-contain" /></span>
          {sidebarOpen && <span>Panel de {currentUser.role}</span>}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActivePage(item.key)}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200
                ${activePage === item.key
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-white'
                }`}
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="font-medium">{item.name}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-3 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all duration-200"
          >
            <span className="flex-shrink-0"><FontAwesomeIcon icon={faDoorClosed} /></span>
            {sidebarOpen && <span className="font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* NAVBAR SUPERIOR */}
        <header className="h-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shadow-sm flex-shrink-0 transition-colors">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg dark:text-slate-300">
              {sidebarOpen ? <FontAwesomeIcon icon={faAngleLeft} /> : <FontAwesomeIcon icon={faAngleRight} />}
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-amber-400 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-sm border border-slate-200 dark:border-slate-600 group"
              title={darkMode ? "Pasar a modo claro" : "Pasar a modo oscuro"}
            >
              <FontAwesomeIcon
                icon={darkMode ? faSun : faMoon}
                className={`w-5 h-5 transition-all duration-500 ${darkMode ? 'rotate-0' : '-rotate-12 group-hover:rotate-0'}`}
              />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{currentUser.username ?? 'Usuario'}</p>
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
              {(currentUser.username?.[0] ?? 'U').toUpperCase()}
            </div>
          </div>
        </header>

        {/* ÁREA DE TRABAJO */}
        <section className="p-8 overflow-y-auto flex-1">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 animate-fade-in">{PAGE_TITLES[activePage]}</h1>
          <div key={activePage} className="animate-slide-up">
            {renderContent()}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;