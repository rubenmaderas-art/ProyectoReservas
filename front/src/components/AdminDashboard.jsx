import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleLeft, faAngleRight, faHouse, faCar, faBars } from '@fortawesome/free-solid-svg-icons';
import { faCalendarCheck, faCalendarAlt, faClock, faFile, faUser } from '@fortawesome/free-regular-svg-icons';
import macrosadLogo from '../assets/isotipo-petalos.svg';
import { Toaster } from 'react-hot-toast';
import VehiclesView from './VehiclesView';
import ReservationsView from './ReservationsView';
import UsersView from './UsersView';
import useIsMobile from '../hooks/useIsMobile';
import { getStoredDarkMode, persistAndApplyTheme } from '../utils/theme';

// ── Helpers ──
const STATUS_RESERVATION = {
  aprobada: 'bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30',
  activa: 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
  entregado: 'bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30',
  pendiente: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
  rechazada: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
  validado: 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
  fecha: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ── Vista Inicio ──
const HomeView = ({ stats, reservations, loading, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const isAdmin = user.role === 'admin' || user.role === 'supervisor';
  let displayedReservations = isAdmin ? reservations : reservations.filter(r => r.user_id === user.id);

  // Aplicar búsqueda global
  if (searchTerm.trim() !== '') {
    const query = searchTerm.toLowerCase().trim();
    displayedReservations = displayedReservations.filter(r =>
      r.username?.toLowerCase().includes(query) ||
      r.model?.toLowerCase().includes(query) ||
      r.license_plate?.toLowerCase().includes(query) ||
      r.id.toString().includes(query)
    );
  }

  return (
    <div className="animate-fade-in space-y-8 h-full flex flex-col">

      {/* Solo mostrar estadísticas si es admin o supervisor */}
      {(user.role === 'admin' || user.role === 'supervisor') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
          <StatCard title="Total de vehículos" value={stats.totalVehiculos} color="blue-500" icon={<FontAwesomeIcon icon={faCar} />} />
          <StatCard title="Reservas activas" value={stats.reservasActivas} color="green-500" icon={<FontAwesomeIcon icon={faCalendarCheck} />} />
          <StatCard title="Documentos expirados" value={stats.documentosExpirados} color={stats.documentosExpirados > 0 ? "red-500" : "amber-500"} icon={<FontAwesomeIcon icon={faFile} />} />
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6 flex-1 flex flex-col overflow-hidden transition-all hover:shadow-md">
        <div className="flex flex-wrap items-left gap-4 mb-4 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {isAdmin ? 'Últimas reservas' : 'Mis reservas'}
          </h2>
          <div className="relative flex-1 max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar reservas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-200"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-slate-400 text-center py-12 italic">Cargando reservas...</div>
        ) : displayedReservations.length === 0 ? (
          <div className="text-slate-400 text-center py-12 italic">No hay reservas registradas</div>
        ) : (
          <div className="flex-1 overflow-auto form-scrollbar min-h-0">
            <table className="w-full text-sm text-left relative">
              <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">
                  {isAdmin && <th className="pb-3 px-4 text-center">Usuario</th>}
                  <th className="pb-3 px-4 text-center">Vehículo</th>
                  <th className="pb-3 px-4 text-center">Matrícula</th>
                  <th className="pb-3 px-4 text-center">Inicio</th>
                  <th className="pb-3 px-4 text-center">Fin</th>
                  <th className="pb-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {displayedReservations.map((r) => (
                  <tr key={r.id} className="border-b border-slate-200/70 dark:border-slate-700/60 odd:bg-slate-50 even:bg-white dark:odd:bg-slate-800/40 dark:even:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                    {isAdmin && <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-200">{r.username}</td>}
                    <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-200">{r.model}</td>
                    <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-200">{r.license_plate}</td>

                    <td className="py-3 px-4 text-center">
                      <span className={`chip-uniform px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_RESERVATION.fecha ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                        {formatDate(r.start_time)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`chip-uniform px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_RESERVATION.fecha ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                        {formatDate(r.end_time)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`chip-uniform px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_RESERVATION[r.status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
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
};

// ── Mobile Header ──
const MobileHeader = ({ onMenuClick, logo, userInitial, onThemeToggle, darkMode, onLogoClick, onUserMenuToggle, showMenuButton }) => (
  <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shadow-sm flex-shrink-0 transition-colors z-[60] relative">
    {showMenuButton ? (
      <button onClick={onMenuClick} className="p-2 text-slate-600 dark:text-slate-300">
        <FontAwesomeIcon icon={faBars} className="text-xl" />
      </button>
    ) : (
      <div
        onClick={onThemeToggle}
        className="cursor-pointer p-2 text-slate-600 dark:text-amber-300 flex-shrink-0"
      >
        {darkMode ? (
          <svg className="w-6 h-6 transition-transform duration-500 rotate-0 hover:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="2" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg className="w-6 h-6 transition-transform duration-500 -rotate-12 hover:rotate-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" stroke="none" opacity="0.85" />
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </div>
    )}

    <div
      onClick={onLogoClick}
      className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform"
    >
      <img src={logo} alt="Logo" className="h-8 w-auto" />
    </div>
    <div className="flex items-center gap-2">
      {/* Si mostramos el menú, el toggle del tema va a la derecha. Si no, ya lo pusimos a la izquierda */}
      {showMenuButton && (
        <div
          onClick={onThemeToggle}
          className="cursor-pointer p-2 text-slate-600 dark:text-amber-300"
        >
          {darkMode ? (
            <svg className="w-5 h-5 transition-transform duration-500 rotate-0 hover:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
              <line x1="12" y1="2" x2="12" y2="4" />
              <line x1="12" y1="20" x2="12" y2="22" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="2" y1="12" x2="4" y2="12" />
              <line x1="20" y1="12" x2="22" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg className="w-5 h-5 transition-transform duration-500 -rotate-12 hover:rotate-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" stroke="none" opacity="0.85" />
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </div>
      )}

      <button
        onClick={onUserMenuToggle}
        className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
      >
        {userInitial}
      </button>
    </div>
  </header>
);

// ── Pagina de inicio de movil ──
const MobileHomeView = ({ reservations, loading, onCreateRes, user, onEdit, onDelete }) => {
  const isAdmin = user.role === 'admin' || user.role === 'supervisor';

  return (
    <div className="animate-fade-in space-y-6 flex flex-col p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-5">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
          {isAdmin ? 'Últimas reservas' : 'Mis reservas'}
        </h2>
        {loading ? (
          <div className="text-slate-400 text-center py-10 italic">Cargando...</div>
        ) : (isAdmin ? reservations : reservations.filter(r => r.user_id === user.id)).length === 0 ? (
          <div className="text-slate-400 text-center py-10 italic">No hay ninguna reserva</div>
        ) : (
          <div className="space-y-4">
            {(isAdmin ? reservations : reservations.filter(r => r.user_id === user.id)).map((r) => (
              <div
                key={r.id}
                className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 shadow-sm hover:border-blue-300 dark:hover:border-blue-800 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{r.model}</h3>
                    {isAdmin && (
                      <p className="text-blue-600 dark:text-blue-400 font-medium text-xs mt-1">Usuario: {r.username}</p>
                    )}
                  </div>
                  <span className={`chip-uniform px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_RESERVATION[r.status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700'}`}>
                    {r.status}
                  </span>
                </div>
                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                    <FontAwesomeIcon icon={faCalendarAlt} className="w-3.5 h-3.5 text-blue-500" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Inicio</span>
                      <span className="text-xs font-semibold">{formatDate(r.start_time)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                    <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5 text-amber-500" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Fin</span>
                      <span className="text-xs font-semibold">{formatDate(r.end_time)}</span>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-400 ml-7">{r.license_plate}</div>
                </div>
                <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-700/50 gap-2">
                  <button
                    onClick={() => onEdit(r)}
                    className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-100 transition-colors text-xs font-bold flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(r.id)}
                    className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {!isAdmin && (
        <button
          onClick={onCreateRes}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-all text-center"
        >
          Crear reserva
        </button>
      )}
    </div>
  );
};

// ── Cards de estadísticas ──
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

// ── Títulos de página ──
const PAGE_TITLES = {
  inicio: 'Dashboard',
};

// ── AdminDashboard ──
const AdminDashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Sincronizar el estado del sidebar al cambiar entre móvil/desktop.
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Determinar la página inicial permitida
  const getInitialPage = (role) => {
    const saved = localStorage.getItem('activeDashboardPage');
    if (saved) {
      // Validar que el rol tenga acceso a esa página
      const allowed = {
        admin: ['inicio', 'vehiculos', 'reservas', 'usuarios'],
        supervisor: ['inicio', 'vehiculos', 'reservas'],
        empleado: ['inicio', 'reservas'] // Empleado puede ver 'inicio'
      };
      if (allowed[role]?.includes(saved)) return saved;
    }
    return 'inicio';
  };

  const [activePage, setActivePage] = useState(getInitialPage(currentUser.role));

  const [darkMode, setDarkMode] = useState(getStoredDarkMode());
  const [stats, setStats] = useState({ totalVehiculos: 0, reservasActivas: 0, documentosExpirados: 0 });
  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Para triggers de móvil
  const [triggerAddReservation, setTriggerAddReservation] = useState(false);
  const [triggerEditReservation, setTriggerEditReservation] = useState(null);
  const [triggerDeleteReservationId, setTriggerDeleteReservationId] = useState(null);

  useEffect(() => {
    persistAndApplyTheme(darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Guardar página activa al cambiar
  useEffect(() => {
    localStorage.setItem('activeDashboardPage', activePage);
  }, [activePage]);

  // Bloquear scroll al abrir modal
  useEffect(() => {
    if (showLogoutModal || triggerDeleteReservationId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showLogoutModal, triggerDeleteReservationId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Si es empleado en móvil, forzar siempre a 'inicio' si está en 'reservas'
  useEffect(() => {
    if (isMobile && currentUser.role === 'empleado' && activePage === 'reservas') {
      setActivePage('inicio');
    }
  }, [isMobile, activePage, currentUser.role]);

  const fetchDashboardData = async () => {
    setLoadingReservations(true);
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

    try {
      // Estadísticas solo para admin/supervisor
      if (currentUser.role === 'admin' || currentUser.role === 'supervisor') {
        const statsRes = await fetch('http://localhost:4000/api/dashboard/stats', { headers });
        if (statsRes.ok) setStats(await statsRes.json());
      }

      // Reservas entra cualquier usuario, pero filtramos por rol
      const resRes = await fetch('http://localhost:4000/api/dashboard/reservations', { headers });
      if (resRes.ok) {
        let data = await resRes.json();

        if (Array.isArray(data)) {
          if (currentUser.role === 'empleado' || currentUser.role === 'supervisor') {
            const now = new Date();
            data = data.filter(r => {
              const endDate = new Date(r.end_time);
              const diffTime = now.getTime() - endDate.getTime();
              const diffDays = diffTime / (1000 * 3600 * 24);
              return diffDays <= 10;
            });
          }
          setReservations(data);
        } else {
          setReservations([]);
        }
      } else {
        setReservations([]);
      }
    } catch (e) {
      console.error('Error cargando dashboard:', e);
      setReservations([]);
    } finally {
      setLoadingReservations(false);
    }
  };

  // Cargar datos al montar o al volver a 'inicio'
  useEffect(() => {
    if (activePage === 'inicio') {
      fetchDashboardData();
    }
  }, [activePage]);

  // Filtramos el menú según el array 'roles' de cada item y ocultamos 'reservas' para empleados en móvil
  const menuItems = [
    { key: 'inicio', name: 'Inicio', icon: <FontAwesomeIcon icon={faHouse} />, roles: ['admin', 'supervisor', 'empleado'] },
    { key: 'vehiculos', name: 'Vehículos', icon: <FontAwesomeIcon icon={faCar} />, roles: ['admin', 'supervisor'] },
    { key: 'reservas', name: 'Reservas', icon: <FontAwesomeIcon icon={faCalendarCheck} />, roles: ['admin', 'supervisor', 'empleado'] },
    { key: 'usuarios', name: 'Usuarios', icon: <FontAwesomeIcon icon={faUser} />, roles: ['admin'] },
  ].filter(item => {
    const isRoleAllowed = item.roles.includes(currentUser.role);
    if (!isRoleAllowed) return false;

    // Si el rol es empleado, ocultamos la pestaña de reservas, ya que su Inicio será las reservas
    if (currentUser.role === 'empleado' && item.key === 'reservas') {
      return false;
    }

    return true;
  });

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const toggleTheme = () => setDarkMode(prev => !prev);
  const openProfilePage = () => {
    setIsUserMenuOpen(false);
    navigate('/perfil');
  };
  const openLogoutModalFromMenu = () => {
    setIsUserMenuOpen(false);
    handleLogout();
  };

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/', { replace: true });
  };

  const renderContent = () => {
    switch (activePage) {
      case 'inicio':
        return (
          <>
            {isMobile ? (
              <MobileHomeView
                reservations={reservations}
                loading={loadingReservations}
                user={currentUser}
                onCreateRes={() => {
                  setTriggerAddReservation(true);
                  if (currentUser.role !== 'empleado') setActivePage('reservas');
                }}
                onEdit={(res) => {
                  setTriggerEditReservation(res);
                  if (currentUser.role !== 'empleado') setActivePage('reservas');
                }}
                onDelete={(id) => {
                  setTriggerDeleteReservationId(id);
                  if (currentUser.role !== 'empleado') setActivePage('reservas');
                }}
              />
            ) : currentUser.role === 'empleado' ? (
              <ReservationsView
                shouldOpenAddModal={triggerAddReservation}
                onAddModalOpened={() => setTriggerAddReservation(false)}
                reservationToEdit={triggerEditReservation}
                onEditModalOpened={() => setTriggerEditReservation(null)}
                reservationToDeleteId={triggerDeleteReservationId}
                onDeleteActionHandled={() => setTriggerDeleteReservationId(null)}
                onOperationComplete={fetchDashboardData}
              />
            ) : (
              <HomeView stats={stats} reservations={reservations} loading={loadingReservations} user={currentUser} />
            )}

            {/* Para empleados en móvil, manejamos los modales de reserva aquí mismo sin redirigir */}
            {isMobile && currentUser.role === 'empleado' && (
              <ReservationsView
                headless
                shouldOpenAddModal={triggerAddReservation}
                onAddModalOpened={() => setTriggerAddReservation(false)}
                reservationToEdit={triggerEditReservation}
                onEditModalOpened={() => setTriggerEditReservation(null)}
                reservationToDeleteId={triggerDeleteReservationId}
                onDeleteActionHandled={() => setTriggerDeleteReservationId(null)}
                onOperationComplete={fetchDashboardData}
              />
            )}
          </>
        );
      case 'vehiculos': return <VehiclesView />;
      case 'reservas':
        return <ReservationsView
          shouldOpenAddModal={triggerAddReservation}
          onAddModalOpened={() => setTriggerAddReservation(false)}
          reservationToEdit={triggerEditReservation}
          onEditModalOpened={() => setTriggerEditReservation(null)}
          reservationToDeleteId={triggerDeleteReservationId}
          onDeleteActionHandled={() => setTriggerDeleteReservationId(null)}
        />;
      case 'usuarios': return <UsersView />;
      default: return null;
    }
  };

  const pageTitle = activePage === 'inicio' && currentUser.role === 'empleado'
    ? 'Inicio'
    : PAGE_TITLES[activePage];

  return (
    <div className="h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-300 overflow-hidden">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { borderRadius: '12px', fontFamily: 'inherit', fontSize: '14px' },
          success: { style: { background: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#4ade80' : '#166534', border: `1px solid ${darkMode ? '#166534' : '#bbf7d0'}` } },
          error: { style: { background: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#f87171' : '#991b1b', border: `1px solid ${darkMode ? '#991b1b' : '#fecaca'}` } },
        }}
      />

      {isMobile && (
        <MobileHeader
          showMenuButton={currentUser.role !== 'empleado'}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          logo={macrosadLogo}
          onLogoClick={() => setActivePage('inicio')}
          userInitial={(currentUser.username?.[0] ?? 'U').toUpperCase()}
          onThemeToggle={toggleTheme}
          darkMode={darkMode}
          onUserMenuToggle={() => setIsUserMenuOpen(prev => !prev)}
        />
      )}

      {isMobile && isUserMenuOpen && (
        <>
          <button
            onClick={() => setIsUserMenuOpen(false)}
            className="fixed inset-0 z-[95]"
            aria-label="Cerrar menu de usuario"
          />
          <div className="fixed top-16 right-4 mt-2 w-56 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-[100] overflow-hidden">
            <button
              onClick={openProfilePage}
              className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Administrar perfil
            </button>
            <div className="h-px bg-slate-100 dark:bg-slate-700" />
            <button
              onClick={openLogoutModalFromMenu}
              className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Cerrar sesion
            </button>
          </div>
        </>
      )}

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        ${isMobile
          ? `fixed inset-y-0 left-0 z-[80] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
          : `relative ${sidebarOpen ? 'w-64' : 'w-20'}`
        } 
        bg-white dark:bg-slate-900 transition-all duration-300 flex flex-col shadow-xl border-r border-slate-200 dark:border-slate-800 flex-shrink-0`}
      >
        {!isMobile && (
          <div
            onClick={() => setActivePage('inicio')}
            className="p-6 text-slate-800 dark:text-white font-bold text-xl border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 cursor-pointer group transition-colors"
          >
            <span className="p-2 rounded-lg text-sm flex-shrink-0 group-hover:scale-110 transition-transform">
              <img src={macrosadLogo} alt="Macrosad" className="w-8 h-8 object-contain" />
            </span>
            {sidebarOpen && <span className="group-hover:text-blue-600 transition-colors">Reserva de Vehículos</span>}
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setActivePage(item.key);
                if (isMobile) setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200
                ${activePage === item.key
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-white'
                }`}
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              {(sidebarOpen || isMobile) && <span className="font-medium">{item.name}</span>}
            </button>
          ))}
        </nav>

      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* NAVBAR SUPERIOR - Solo en Desktop */}
        {!isMobile && (
          <header className="h-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shadow-sm flex-shrink-0 transition-colors">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg dark:text-slate-300">
                {sidebarOpen ? <FontAwesomeIcon icon={faAngleLeft} /> : <FontAwesomeIcon icon={faAngleRight} />}
              </button>

              <div
                onClick={toggleTheme}
                className="cursor-pointer p-2 text-slate-600 dark:text-amber-300 hover:scale-110 active:scale-95 transition-all group"
                title={darkMode ? "Pasar a modo claro" : "Pasar a modo oscuro"}
              >
                {darkMode ? (
                  /* Sol estilizado */
                  <svg className="w-6 h-6 transition-transform duration-500 rotate-0 group-hover:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
                    <line x1="12" y1="2" x2="12" y2="4" />
                    <line x1="12" y1="20" x2="12" y2="22" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="2" y1="12" x2="4" y2="12" />
                    <line x1="20" y1="12" x2="22" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (

                  /* Luna con estrella */
                  <svg className="w-6 h-6 transition-transform duration-500 -rotate-12 group-hover:rotate-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" stroke="none" opacity="0.85" />
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </div>
            </div>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(prev => !prev)}
                className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{currentUser.username ?? 'Usuario'}</p>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                  {(currentUser.username?.[0] ?? 'U').toUpperCase()}
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-[120] overflow-hidden">
                  <button
                    onClick={openProfilePage}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Administrar perfil
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-700" />
                  <button
                    onClick={openLogoutModalFromMenu}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Cerrar sesion
                  </button>
                </div>
              )}
            </div>

          </header>
        )}

        {/* ÁREA DE TRABAJO */}
        <section className={`${isMobile ? 'p-0' : 'p-8'} overflow-hidden flex-1 flex flex-col`}>
          {!isMobile && <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 animate-fade-in shrink-0">{pageTitle}</h1>}
          <div key={activePage} className={`animate-slide-up flex-1 flex flex-col min-h-0 ${isMobile && activePage === 'inicio' ? 'overflow-y-auto' : ''}`}>
            {renderContent()}
          </div>
        </section>
      </main>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-xl animate-modal-overlay"
            onClick={() => setShowLogoutModal(false)}
          />
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full relative z-10 shadow-2xl animate-scale-in border border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-center text-slate-800 dark:text-white mb-2">¿Cerrar sesión?</h3>
            <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
              Tendrás que volver a introducir tus credenciales.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all hover:scale-[1.02] active:scale-95"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
