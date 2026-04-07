import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleLeft, faAngleRight, faHouse, faCar, faBars, faSquareCheck, faUser, faFile, faHistory } from '@fortawesome/free-solid-svg-icons';
import { faCalendarDays, faCalendarAlt, faClock } from '@fortawesome/free-regular-svg-icons';
import macrosadLogo from '../assets/isotipo-petalos.svg';
import { Toaster, toast } from 'react-hot-toast';
import VehiclesView from './VehiclesView';
import ReservationsView from './ReservationsView';
import UsersView from './UsersView';
import useIsMobile from '../hooks/useIsMobile';
import { useSocket } from '../hooks/useSocket';
import { getStoredDarkMode, persistAndApplyTheme } from '../utils/theme';
import ValidationsView from './ValidationsView';
import AuditLogView from './AuditLogView';

// ── Helpers ──
const STATUS_RESERVATION = {
  aprobada: 'bg-cyan-100 text-black border border-cyan-200 dark:bg-cyan-500/20 dark:text-white/90 dark:border-cyan-500/30',
  activa: 'bg-blue-100 text-black border border-blue-200 dark:bg-blue-500/20 dark:text-white/90 dark:border-blue-500/30',
  pendiente: 'bg-amber-100 text-black border border-amber-200 dark:bg-amber-500/20 dark:text-white/90 dark:border-amber-500/30',
  rechazada: 'bg-red-100 text-black border border-red-200 dark:bg-red-500/20 dark:text-white/90 dark:border-red-500/30',
  finalizada: 'bg-violet-100 text-black border border-violet-200 dark:bg-violet-500/20 dark:text-white/90 dark:border-violet-500/30',
  fecha: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

const EMPLOYEE_FINALIZED_VISIBILITY_DAYS = 3;
const DELIVERY_GRACE_HOURS = 24;
const SUBMITTED_DELIVERY_STORAGE_KEY = 'submittedDeliveryReservationIds';

const getDeliveryGraceDeadline = (reservation) => {
  const endTime = new Date(reservation?.end_time).getTime();
  if (Number.isNaN(endTime)) return null;
  return endTime + (DELIVERY_GRACE_HOURS * 60 * 60 * 1000);
};

const hasDeliveryBeenSubmitted = (reservation) => {
  if (!reservation) return false;
  if (reservation.km_entrega !== undefined && reservation.km_entrega !== null) return true;
  if (String(reservation.informe_entrega ?? '').trim() !== '') return true;
  if (String(reservation.estado_entrega ?? '').trim() !== '') return true;
  return false;
};

const readSubmittedDeliveryIds = () => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SUBMITTED_DELIVERY_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const writeSubmittedDeliveryIds = (ids) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SUBMITTED_DELIVERY_STORAGE_KEY, JSON.stringify([...new Set((ids || []).map(String))]));
};

const markDeliverySubmittedLocally = (reservationId) => {
  if (reservationId === undefined || reservationId === null) return;
  const current = readSubmittedDeliveryIds();
  writeSubmittedDeliveryIds([...current, String(reservationId)]);
};

const reconcileSubmittedDeliveryIds = (reservationsList) => {
  const localIds = readSubmittedDeliveryIds();
  const serverIds = (Array.isArray(reservationsList) ? reservationsList : [])
    .filter((reservation) => hasDeliveryBeenSubmitted(reservation))
    .map((reservation) => String(reservation.id));
  writeSubmittedDeliveryIds([...localIds, ...serverIds]);
};

const hasLocalSubmittedDelivery = (reservationId) => {
  if (reservationId === undefined || reservationId === null) return false;
  return readSubmittedDeliveryIds().some((id) => String(id) === String(reservationId));
};

const shouldKeepReservationVisibleForDelivery = (reservation, now = Date.now()) => {
  const status = String(reservation?.status ?? '').toLowerCase();
  if (status !== 'finalizada') return false;

  const validationStatus = String(reservation?.validacion_entrega ?? '').toLowerCase();
  if (validationStatus === 'revisada') return false;

  if (hasDeliveryBeenSubmitted(reservation)) return false;
  if (hasLocalSubmittedDelivery(reservation?.id)) return false;

  const graceDeadline = getDeliveryGraceDeadline(reservation);
  if (graceDeadline === null) return false;

  return graceDeadline > now;
};

const getEmployeeVisibleReservations = (allReservations, userId, now = Date.now()) => (
  (Array.isArray(allReservations) ? allReservations : []).filter((reservation) => {
    if (String(reservation.user_id) !== String(userId)) return false;

    const status = String(reservation.status ?? '').toLowerCase();
    if (status !== 'finalizada') return true;

    const endTime = new Date(reservation.end_time).getTime();
    if (Number.isNaN(endTime)) return false;

    return endTime + (EMPLOYEE_FINALIZED_VISIBILITY_DAYS * 24 * 60 * 60 * 1000) > now;
  })
);

// ── Vista Inicio ──
const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const toMySqlDateTime = (value) => {
  if (!value) return null;
  const raw = String(value).trim();

  // Si ya tiene una 'T' y termina en 'Z' (ISO UTC), lo dejamos tal cual. 
  // El backend lo recibirá como string y el driver o el constructor Date lo manejarán.
  if (raw.includes('T')) {
    return raw;
  }

  const mysqlFormat = raw.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/);
  if (mysqlFormat) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  // Si tenemos que formatearlo nosotros, usamos ISO
  return parsed.toISOString();
};

const findActiveReservationForUser = (allReservations, userId) => {
  if (!Array.isArray(allReservations) || !userId) return null;
  const now = new Date();
  const allowedStatuses = new Set(['pendiente', 'aprobada', 'activa', 'finalizada']);

  const candidates = allReservations
    .filter((reservation) => String(reservation.user_id) === String(userId))
    .filter((reservation) => allowedStatuses.has((reservation.status ?? '').toLowerCase()))
    .filter((reservation) => {
      const start = new Date(reservation.start_time);
      const end = new Date(reservation.end_time);
      const status = String(reservation.status ?? '').toLowerCase();

      if (status === 'pendiente' && now >= start) {
        return false;
      }

      if (status === 'finalizada') {
        return shouldKeepReservationVisibleForDelivery(reservation, now.getTime());
      }

      return start <= now && now <= end;
    })
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  return candidates[0] ?? null;
};

const ActiveReservationCard = ({
  reservation,
  onDeliver,
  isSubmitting = false,
  vehicle: propVehicle,
}) => {
  const [vehicle, setVehicle] = useState(propVehicle || null);
  const [kmInitial, setKmInitial] = useState(0);
  const [kmEntrega, setKmEntrega] = useState('');
  const [informeEntrega, setInformeEntrega] = useState('');
  const [estadoEntrega, setEstadoEntrega] = useState('correcto');

  useEffect(() => {
    const fetchVehicle = async () => {
      if (reservation?.vehicle_id) {
        try {
          const res = await fetch(`http://localhost:4000/api/dashboard/vehicles`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            const vehicles = await res.json();
            const found = vehicles.find(v => String(v.id) === String(reservation.vehicle_id));
            if (found) {
              setVehicle(found);
              setKmInitial(found.kilometers || 0);
            }
          }
        } catch (err) {
          console.error('Error fetching vehicle for card:', err);
        }
      }
    };

    if (!propVehicle) {
      fetchVehicle();
    } else {
      setVehicle(propVehicle);
      setKmInitial(propVehicle.kilometers || 0);
    }

    setKmEntrega('');
    setInformeEntrega('');
    setEstadoEntrega('correcto');
  }, [reservation?.id, propVehicle]);

  if (!reservation) return null;

  const isDeliveryPending = String(reservation.status ?? '').toLowerCase() === 'finalizada';

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedKm = Number.parseInt(kmEntrega, 10);

    if (Number.isNaN(parsedKm)) {
      toast.error('Introduce un kilometraje valido.');
      return;
    }

    if (parsedKm < kmInitial) {
      toast.error(`Los kilómetros no pueden ser inferiores a los iniciales (${kmInitial} km).`);
      return;
    }

    onDeliver?.({
      reservation,
      kmEntrega: parsedKm,
      estadoEntrega,
      informeEntrega: informeEntrega.trim(),
    });
  };

  return (
    <div className="glass-card-solid rounded-2xl shadow-sm p-5 sm:p-8 flex-none">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {isDeliveryPending ? 'Reserva pendiente de validación' : 'Reserva activa'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {reservation.model} ({reservation.license_plate})
          </p>
        </div>
        <span className={`chip-uniform px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_RESERVATION[reservation.status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
          {reservation.status}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 text-xs sm:text-sm">
        <div className="rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 p-3 text-slate-600 dark:text-slate-300">
          <p className="font-semibold uppercase tracking-wide text-[10px] text-slate-400 dark:text-slate-500">Inicio</p>
          <p className="font-semibold mt-1">{formatDateTime(reservation.start_time)}</p>
        </div>
        <div className="rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 p-3 text-slate-600 dark:text-slate-300">
          <p className="font-semibold uppercase tracking-wide text-[10px] text-slate-400 dark:text-slate-500">
            {isDeliveryPending ? 'Fin + 24h' : 'Fin'}
          </p>
          <p className="font-semibold mt-1">{formatDateTime(reservation.end_time)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Kilometros actuales
          </label>
          <input
            type="number"
            min={kmInitial}
            step="1"
            required
            value={kmEntrega}
            onChange={(e) => setKmEntrega(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            placeholder={`Mínimo: ${kmInitial}`}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Estado de entrega
          </label>
          <select
            value={estadoEntrega}
            onChange={(e) => setEstadoEntrega(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          >
            <option value="correcto">Correcto</option>
            <option value="incorrecto">Incorrecto</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Anotaciones de entrega
          </label>
          <textarea
            rows={4}
            value={informeEntrega}
            onChange={(e) => setInformeEntrega(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-y min-h-[110px]"
            placeholder="Observaciones de la entrega..."
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-white font-semibold hover:brightness-90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-primary/30"
        >
          {isSubmitting ? 'Enviando...' : 'Finalizar entrega'}
        </button>
      </form>
    </div>
  );
};

const HomeView = ({ stats, reservations, loading, user, activeReservation, onDeliverActiveReservation, deliveringActiveReservation }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const isAdmin = user.role === 'admin' || user.role === 'supervisor';
  let displayedReservations = isAdmin ? reservations : getEmployeeVisibleReservations(reservations, user.id);

  // Aplicar búsqueda global, solo para administradores
  if (searchTerm.trim() !== '') {
    const query = searchTerm.toLowerCase().trim();
    displayedReservations = displayedReservations.filter(r =>
      r.username?.toLowerCase().includes(query) ||
      r.model?.toLowerCase().includes(query) ||
      r.license_plate?.toLowerCase().includes(query) ||
      r.id.toString().includes(query) ||
      String(r.status ?? '').toLowerCase().includes(query)
    );
  }

  // Paginación
  const totalPages = Math.ceil(displayedReservations.length / itemsPerPage);
  const paginatedReservations = displayedReservations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="animate-fade-in space-y-8">

      {/* Solo mostrar estadísticas si es admin o supervisor */}
      {(user.role === 'admin' || user.role === 'supervisor') && (
        <div className="select-none grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
          <StatCard title="Total de vehículos" value={stats.totalVehiculos} color="secondary" icon={<FontAwesomeIcon icon={faCar} />} />
          <StatCard title="Vehículos pendientes de validación" value={stats.vehiculosPendientesValidacion} color="secondary" icon={<FontAwesomeIcon icon={faSquareCheck} />} />
          <StatCard title="Documentos expirados" value={stats.documentosExpirados} color={stats.documentosExpirados > 0 ? "red-500" : "secondary"} icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          } />
        </div>
      )}

      {(user.role === 'empleado' || user.role === 'supervisor' || user.role === 'admin') && activeReservation && (
        <ActiveReservationCard
          reservation={activeReservation}
          onDeliver={onDeliverActiveReservation}
          isSubmitting={deliveringActiveReservation}
        />
      )}

      <div className="glass-card-solid rounded-2xl shadow-sm p-6 flex flex-col transition-all hover:shadow-md shrink-0 h-[540px]">
        <div className="select-none flex flex-wrap items-left gap-4 mb-3 shrink-0">
          <h2 className="select-none text-lg font-bold text-slate-800 dark:text-white">
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
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 dark:text-slate-200"
            />
          </div>
        </div>

        {loading ? (
          <div className="min-h-[8rem] flex items-center justify-center text-slate-400 text-center italic">
            Cargando reservas...
          </div>
        ) : displayedReservations.length === 0 ? (
          <div className="min-h-[8rem] flex items-center justify-center text-slate-400 text-center italic">
            No hay reservas registradas
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <div className="flex-1 min-h-0 overflow-auto form-scrollbar">
                <table className="w-full text-sm text-left relative">
                  <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10 [&>tr>th]:pt-6 [&>tr>th:first-child]:rounded-tl-2xl [&>tr>th:last-child]:rounded-tr-2xl">
                    <tr className="select-none border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">
                      {isAdmin && <th className="pb-3 px-4 text-center">Usuario</th>}
                      <th className="pb-3 px-4 text-center">Vehículo</th>
                      <th className="pb-3 px-4 text-center">Matrícula</th>
                      <th className="pb-3 px-4 text-center">Inicio</th>
                      <th className="pb-3 px-4 text-center">Fin</th>
                      <th className="pb-3 px-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReservations.map((r) => (
                      <tr key={r.id} className="border-b border-slate-200/70 dark:border-slate-700/60 odd:bg-slate-50 even:bg-white dark:odd:bg-slate-800 dark:even:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                        {isAdmin && <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-200">{r.username}</td>}
                        <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-200">{r.model}</td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-200">{r.license_plate}</td>

                        <td className="py-3 px-4 text-center">
                          <span className={`chip-uniform px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_RESERVATION.fecha ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                            {formatDateTime(r.start_time)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`chip-uniform px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_RESERVATION.fecha ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                            {formatDateTime(r.end_time)}
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
            </div>

            {/* PAGINACIÓN */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between px-2 sm:px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="select-none text-xs text-slate-500 dark:text-slate-400">
                  Página <span className="font-bold text-slate-700 dark:text-slate-200">{currentPage}</span> de {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <FontAwesomeIcon icon={faAngleLeft} className="text-xs" />
                  </button>

                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                      const page = i + 1;
                      if (totalPages > 5 && Math.abs(page - currentPage) > 1 && page !== 1 && page !== totalPages) {
                        if (page === 2 || page === totalPages - 1) return <span key={page} className="px-1 text-slate-400">...</span>;
                        return null;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`select-none w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === page
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'hover:bg-white hover:shadow-lg hover:shadow-pink-600/25 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
                            }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <FontAwesomeIcon icon={faAngleRight} className="text-xs" />
                  </button>

                  <div className="ml-4 flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                    <span className="select-none text-xs text-slate-400">Ir a:</span>
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val >= 1 && val <= totalPages) setCurrentPage(val);
                      }}
                      className="w-12 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ── Mobile Header ──
const MobileHeader = ({ onMenuClick, logo, userInitial, onThemeToggle, darkMode, onLogoClick, onUserMenuToggle, showMenuButton }) => (
  <header className="select-none h-16 glass-card-solid flex items-center justify-between px-4 shadow-sm flex-shrink-0 z-[60] relative">
    {showMenuButton ? (
      <button onClick={onMenuClick} className="p-2 text-black80dark:text-white">
        <FontAwesomeIcon icon={faBars} className="text-xl" />
      </button>
    ) : (
      <div
        onClick={onThemeToggle}
        className="cursor-pointer p-2 text-black/70 dark:text-amber-400 flex-shrink-0 relative group isolate"
      >
        <div className={`transition-all duration-500 transform ${darkMode ? 'rotate-[360deg] scale-100 opacity-100' : 'rotate-0 scale-0 opacity-0'} absolute inset-0 flex items-center justify-center`}>
          {/* Sol Premium */}
          <svg className="w-6 h-6 sun-icon-inner shadow-amber-500/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
            {[...Array(8)].map((_, i) => (
              <line key={i} x1="12" y1="1" x2="12" y2="3" transform={`rotate(${i * 45} 12 12)`} className="text-amber-500" />
            ))}
          </svg>
        </div>
        <div className={`transition-all duration-500 transform ${!darkMode ? 'rotate-0 scale-100 opacity-100' : 'rotate-[-90deg] scale-0 opacity-0'} flex items-center justify-center`}>
          {/* Luna Premium */}
          <svg className="w-6 h-6 moon-icon-inner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" stroke="none" opacity="0.85" />
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </div>
      </div>
    )}

    <div
      onClick={onLogoClick}
      className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform"
    >
      <img src={logo} alt="Logo" className="h-8 w-auto" />
    </div>
    <div className="flex items-center gap-2">
      {/* Si mostramos el menú, el toggle del tema va a la derecha. Si no en la izquierda */}
      {showMenuButton && (
        <div
          onClick={onThemeToggle}
          className="cursor-pointer p-2 text-black/70 dark:text-amber-400 relative group isolate"
        >
          <div className={`transition-all duration-500 transform ${darkMode ? 'rotate-[360deg] scale-100 opacity-100' : 'rotate-0 scale-0 opacity-0'} absolute inset-0 flex items-center justify-center`}>
            {/* Sol Premium Small */}
            <svg className="w-5 h-5 sun-icon-inner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
              {[...Array(8)].map((_, i) => (
                <line key={i} x1="12" y1="1" x2="12" y2="3" transform={`rotate(${i * 45} 12 12)`} className="text-amber-500" />
              ))}
            </svg>
          </div>
          <div className={`transition-all duration-500 transform ${!darkMode ? 'rotate-0 scale-100 opacity-100' : 'rotate-[-90deg] scale-0 opacity-0'} flex items-center justify-center`}>
            {/* Luna Premium Small */}
            <svg className="w-5 h-5 moon-icon-inner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" stroke="none" opacity="0.85" />
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </div>
        </div>
      )}

      <button
        onClick={onUserMenuToggle}
        className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md shadow-primary/40"
      >
        {userInitial}
      </button>
    </div>
  </header>
);

// ── Pagina de inicio de movil ──
const MobileHomeView = ({
  reservations,
  loading,
  onCreateRes,
  user,
  onEdit,
  onDelete,
  activeReservation,
  onDeliverActiveReservation,
  deliveringActiveReservation,
}) => {
  const isAdmin = user.role === 'admin' || user.role === 'supervisor';
  const [visibleItems, setVisibleItems] = useState(10);
  const scrollObserverRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleItems((prev) => prev + 10);
        }
      },
      { threshold: 0.1 }
    );

    if (scrollObserverRef.current) {
      observer.observe(scrollObserverRef.current);
    }

    return () => observer.disconnect();
  }, [reservations]);

  const displayedReservations = isAdmin ? reservations : getEmployeeVisibleReservations(reservations, user.id);
  const paginatedReservations = displayedReservations.slice(0, visibleItems);

  return (
    <div className="animate-fade-in space-y-6 flex flex-col p-4">
      {(user.role === 'empleado' || user.role === 'supervisor' || user.role === 'admin') && activeReservation && (
        <ActiveReservationCard
          reservation={activeReservation}
          onDeliver={onDeliverActiveReservation}
          isSubmitting={deliveringActiveReservation}
        />
      )}

      <div className="glass-card-solid rounded-2xl shadow-sm p-5">
        <h2 className="select-none text-lg font-bold text-slate-800 dark:text-white mb-4">
          {isAdmin ? 'Últimas reservas' : 'Mis reservas'}
        </h2>
        {loading ? (
          <div className="text-slate-400 text-center py-10 italic">Cargando...</div>
        ) : displayedReservations.length === 0 ? (
          <div className="text-slate-400 text-center py-10 italic">No hay ninguna reserva</div>
        ) : (
          <div className="space-y-4">
            {paginatedReservations.map((r) => (
              <div
                key={r.id}
                className="glass-card rounded-2xl p-5 shadow-sm hover:bg-white/25 dark:hover:bg-white/10 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{r.model}</h3>
                    {isAdmin && (
                      <p className="text-primary font-medium text-xs mt-1">Usuario: {r.username}</p>
                    )}
                  </div>
                  <span className={`chip-uniform px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_RESERVATION[r.status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700'}`}>
                    {r.status}
                  </span>
                </div>
                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                    <FontAwesomeIcon icon={faCalendarAlt} className="w-3.5 h-3.5 text-primary" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Inicio</span>
                      <span className="text-xs font-semibold">{formatDateTime(r.start_time)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                    <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5 text-amber-500" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Fin</span>
                      <span className="text-xs font-semibold">{formatDateTime(r.end_time)}</span>
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
            {visibleItems < displayedReservations.length && (
              <div ref={scrollObserverRef} className="h-10 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        )}
      </div>
      {!isAdmin && (
        <button
          onClick={onCreateRes}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 active:scale-95 transition-all text-center"
        >
          Crear reserva
        </button>
      )}
    </div>
  );
};

// ── Cards de estadísticas ──
const STAT_COLORS = {
  'secondary': {
    text: 'text-secondary dark:text-slate-300',
    bg: 'bg-secondary/10 dark:bg-slate-300/10'
  },
  'green-500': { text: 'text-green-500', bg: 'bg-green-500/10' },
  'amber-500': { text: 'text-amber-500', bg: 'bg-amber-500/10' },
  'red-500': { text: 'text-red-500', bg: 'bg-red-500/10' },
};

const StatCard = ({ title, value, color, icon }) => {
  const { text, bg } = STAT_COLORS[color] ?? { text: 'text-slate-500', bg: 'bg-slate-500/10' };
  return (
    <div className="glass-card-solid p-6 rounded-2xl shadow-sm flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-md group">
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
  const { socket, isConnected } = useSocket();

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
        admin: ['inicio', 'vehiculos', 'reservas', 'usuarios', 'validaciones', 'auditoria'],
        supervisor: ['inicio', 'vehiculos', 'reservas', 'validaciones'],
        empleado: ['inicio'] // Empleado SIEMPRE debe ir a inicio para ver su dashboard completo
      };
      if (allowed[role]?.includes(saved)) return saved;
    }
    return 'inicio';
  };

  const [activePage, setActivePage] = useState(getInitialPage(currentUser.role));

  const [darkMode, setDarkMode] = useState(getStoredDarkMode());
  const [stats, setStats] = useState({ totalVehiculos: 0, reservasActivas: 0, vehiculosPendientesValidacion: 0, documentosExpirados: 0 });
  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [deliveringActiveReservation, setDeliveringActiveReservation] = useState(false);
  const [reservationsViewKey, setReservationsViewKey] = useState(0);
  const userMenuRef = useRef(null);
  const activePageRef = useRef(activePage);

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

  // Mantener ref de activePage sincronizado (pero no causa remount del listener)
  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

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
        reconcileSubmittedDeliveryIds(data);

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

  // Función para recargar solo las reservas
  const reloadReservations = async () => {
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    try {
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
        }
      }
    } catch (e) {
      console.error('Error recargando reservas:', e);
    }
  };

  // Función para recargar solo los usuarios
  const reloadUsers = () => {
    // TriggerReload para UsersView - actualiza la tabla de usuarios
    // Se implementa en el componente UsersView
    setReservationsViewKey(prev => prev + 1);
  };

  // Cargar datos al montar o al cambiar de página
  useEffect(() => {
    fetchDashboardData();

    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [activePage]);

  // Configurar WebSocket para escuchar nuevas reservas en tiempo real
  useEffect(() => {
    if (socket && isConnected && (currentUser.role === 'admin' || currentUser.role === 'supervisor')) {
      socket.emit('admin_dashboard_open', currentUser.id);

      // ============ EVENTOS DE RESERVAS ============

      // Nueva reserva → Agregar a tabla
      socket.on('new_reservation', (newReservation) => {
        toast.success(`Nueva reserva: ${newReservation.username} - ${newReservation.model}`, {
          duration: 5000
        });
        setReservations(prev => [newReservation, ...prev]);
      });

      // Actualizar reserva → Actualizar tabla dinámicamente
      socket.on('updated_reservation', (updatedReservation) => {
        setReservations(prev =>
          prev.map(r => r.id === updatedReservation.id ? updatedReservation : r)
        );
      });

      // Eliminar reserva → Eliminar de tabla
      socket.on('deleted_reservation', (data) => {
        setReservations(prev => prev.filter(r => r.id !== data.id));
      });

      // ============ EVENTOS DE USUARIOS ============

      // Nuevo usuario → Recargar tabla de usuarios
      socket.on('new_user', (newUser) => {
        toast.success(`Nuevo usuario: ${newUser.username} (${newUser.role})`, {
          duration: 5000,
          icon: '👤'
        });
        if (activePageRef.current === 'usuarios') {
          reloadUsers();
        }
      });

      // Actualizar usuario → Recargar tabla de usuarios
      socket.on('updated_user', (updatedUser) => {
        if (updatedUser.changedFields.includes('role')) {
          toast.success(`Rol de ${updatedUser.username} cambió a: ${updatedUser.role}`, {
            duration: 5000,
            icon: '👤'
          });
        } else {
          toast.success(`Usuario ${updatedUser.username} actualizado`, {
            duration: 5000,
            icon: '👤'
          });
        }
        if (activePageRef.current === 'usuarios') {
          reloadUsers();
        }
      });

      // Eliminar usuario → Recargar tabla de usuarios
      socket.on('deleted_user', (data) => {
        toast.success('Usuario eliminado', {
          duration: 5000,
          icon: '👤'
        });
        if (activePageRef.current === 'usuarios') {
          reloadUsers();
        }
      });

      return () => {
        socket.off('new_reservation');
        socket.off('updated_reservation');
        socket.off('deleted_reservation');
        socket.off('new_user');
        socket.off('updated_user');
        socket.off('deleted_user');
      };
    }

    // ============ PARA EMPLEADOS ============
    if (socket && isConnected && currentUser.role === 'empleado') {
      socket.emit('admin_dashboard_open', currentUser.id);

      // Para empleados: escuchar cambios en SUS reservas
      socket.on('updated_reservation', (updatedReservation) => {
        // Si es una reserva del empleado actual, recargar página completa
        if (updatedReservation.user_id === currentUser.id) {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          // Si es reserva de otro, solo actualizar lista
          setReservations(prev =>
            prev.map(r => r.id === updatedReservation.id ? updatedReservation : r)
          );
        }
      });

      // Nuevas reservas → actualizar tabla
      socket.on('new_reservation', (newReservation) => {
        if (newReservation.user_id === currentUser.id) {
          toast.success(`Nueva reserva creada: ${newReservation.model}`, {
            duration: 5000
          });
          setReservations(prev => [newReservation, ...prev]);
        }
      });

      return () => {
        socket.off('updated_reservation');
        socket.off('new_reservation');
      };
    }

  }, [socket, isConnected, currentUser.role, currentUser.id]);

  // Filtramos el menú según el array 'roles' de cada item y ocultamos 'reservas' para empleados en móvil
  const menuItems = [
    { key: 'inicio', name: 'Inicio', icon: <FontAwesomeIcon icon={faHouse} />, roles: ['admin', 'supervisor', 'empleado'] },
    { key: 'vehiculos', name: 'Vehículos', icon: <FontAwesomeIcon icon={faCar} />, roles: ['admin', 'supervisor'] },
    { key: 'reservas', name: 'Reservas', icon: <FontAwesomeIcon icon={faCalendarDays} />, roles: ['admin', 'supervisor', 'empleado'] },
    { key: 'usuarios', name: 'Usuarios', icon: <FontAwesomeIcon icon={faUser} />, roles: ['admin'] },
    { key: 'validaciones', name: 'Validación', icon: <FontAwesomeIcon icon={faSquareCheck} />, roles: ['admin', 'supervisor'] },
    { key: 'auditoria', name: 'Auditoría', icon: <FontAwesomeIcon icon={faHistory} />, roles: ['admin'] },

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

  const activeReservation = (currentUser.role === 'empleado' || currentUser.role === 'supervisor' || currentUser.role === 'admin')
    ? findActiveReservationForUser(reservations, currentUser.id)
    : null;

  const handleDeliverActiveReservation = async ({ reservation, kmEntrega, estadoEntrega, informeEntrega }) => {
    if (!reservation?.id) return;

    setDeliveringActiveReservation(true);

    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

      const response = await fetch(`http://localhost:4000/api/dashboard/reservations/${reservation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          user_id: reservation.user_id,
          vehicle_id: reservation.vehicle_id,
          start_time: toMySqlDateTime(reservation.start_time),
          end_time: toMySqlDateTime(reservation.end_time),
          status: 'finalizada',
          km_entrega: kmEntrega,
          estado_entrega: estadoEntrega ?? 'correcto',
          informe_entrega: informeEntrega,
          validacion_entrega: 'pendiente',
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo finalizar la reserva.');
      }

      markDeliverySubmittedLocally(reservation.id);

      toast.success('Reserva finalizada y vehículo pendiente de validación.');
      setReservations((prev) => prev.map((item) => (
        String(item.id) === String(reservation.id)
          ? {
            ...item,
            status: 'finalizada',
            km_entrega: kmEntrega,
            estado_entrega: estadoEntrega ?? 'correcto',
            informe_entrega: informeEntrega,
            validacion_entrega: 'pendiente',
          }
          : item
      )));

      await fetchDashboardData();
      setReservationsViewKey((prev) => prev + 1);
    } catch (error) {
      toast.error(error.message || 'Error al actualizar la reserva.');
    } finally {
      setDeliveringActiveReservation(false);
    }
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
                activeReservation={activeReservation}
                onDeliverActiveReservation={handleDeliverActiveReservation}
                deliveringActiveReservation={deliveringActiveReservation}
              />
            ) : currentUser.role === 'empleado' ? (
              <div className="animate-fade-in flex flex-col gap-8 min-h-full w-full">
                {activeReservation && (
                  <div className="w-full">
                    <ActiveReservationCard
                      reservation={activeReservation}
                      onDeliver={handleDeliverActiveReservation}
                      isSubmitting={deliveringActiveReservation}
                    />
                  </div>
                )}
                <div className="w-full flex-1 min-h-[32rem] flex flex-col">
                  <ReservationsView
                    key={`employee-inicio-${reservationsViewKey}`}
                    shouldOpenAddModal={triggerAddReservation}
                    onAddModalOpened={() => setTriggerAddReservation(false)}
                    reservationToEdit={triggerEditReservation}
                    onEditModalOpened={() => setTriggerEditReservation(null)}
                    reservationToDeleteId={triggerDeleteReservationId}
                    onDeleteActionHandled={() => setTriggerDeleteReservationId(null)}
                    onOperationComplete={fetchDashboardData}
                  />
                </div>
              </div>
            ) : (
              <HomeView
                stats={stats}
                reservations={reservations}
                loading={loadingReservations}
                user={currentUser}
                activeReservation={activeReservation}
                onDeliverActiveReservation={handleDeliverActiveReservation}
                deliveringActiveReservation={deliveringActiveReservation}
              />
            )}

            {/* Para empleados en móvil, manejamos los modales de reserva aquí mismo sin redirigir */}
            {isMobile && currentUser.role === 'empleado' && (
              <ReservationsView
                key={`employee-mobile-headless-${reservationsViewKey}`}
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
          key={`reservas-page-${reservationsViewKey}`}
          shouldOpenAddModal={triggerAddReservation}
          onAddModalOpened={() => setTriggerAddReservation(false)}
          reservationToEdit={triggerEditReservation}
          onEditModalOpened={() => setTriggerEditReservation(null)}
          reservationToDeleteId={triggerDeleteReservationId}
          onDeleteActionHandled={() => setTriggerDeleteReservationId(null)}
        />;
      case 'usuarios': return <UsersView />;
      case 'validaciones': return <ValidationsView />;
      case 'auditoria': return <AuditLogView />;
      default: return null;
    }
  };

  const pageTitle = activePage === 'inicio' && currentUser.role === 'empleado'
    ? 'Inicio'
    : PAGE_TITLES[activePage];
  const shouldScrollInicioForRole = activePage === 'inicio' && (currentUser.role === 'empleado' || currentUser.role === 'supervisor' || currentUser.role === 'admin');

  return (
    <div className="h-screen bg-white/85 text-slate-900 dark:bg-white/10 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-300 overflow-hidden">
      <Toaster
        position="top-center"
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
          <div className="select-none fixed top-16 right-4 mt-2 w-56 rounded-2xl glass-card-solid shadow-xl z-[100] overflow-hidden">
            <button
              onClick={openProfilePage}
              className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
            >
              Administrar perfil
            </button>
            <div className="h-px bg-slate-100 dark:bg-slate-700" />
            <button
              onClick={openLogoutModalFromMenu}
              className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Cerrar sesión
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
        glass-card-solid transition-all duration-300 flex flex-col shadow-xl border-r border-[#E5007D]/10 dark:border-white/10 flex-shrink-0`}
      >
        {!isMobile && (
          <div
            onClick={() => setActivePage('inicio')}
            className="select-none p-6 text-slate-800 dark:text-white font-bold text-xl border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 cursor-pointer group transition-colors"
          >
            <span className="p-2 rounded-lg text-sm flex-shrink-0 group-hover:scale-110 transition-transform">
              <img src={macrosadLogo} alt="Macrosad" className="w-8 h-8 object-contain" />
            </span>
            {sidebarOpen && <span className="text-black/80 dark:text-white transition-colors">Reserva de vehículos</span>}
          </div>
        )}

        <nav className="select-none flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setActivePage(item.key);
                if (isMobile) setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200
                ${activePage === item.key
                  ? 'bg-[#E5007D] text-white shadow-lg shadow-pink-500/30 dark:bg-[#E5007D] dark:text-white'
                  : 'text-black/85 hover:bg-black/10 dark:text-white/90 dark:hover:bg-white/10'
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
          <header className="h-20 glass-card-solid border-b-0 flex items-center justify-between px-8 shadow-sm flex-shrink-0 relative z-[90]">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/40 dark:hover:bg-white/25 rounded-lg text-black/70 dark:text-white">
                {sidebarOpen ? <FontAwesomeIcon icon={faAngleLeft} /> : <FontAwesomeIcon icon={faAngleRight} />}
              </button>

              <div
                onClick={toggleTheme}
                className="cursor-pointer p-2 text-black/70 dark:text-white/80 dark:hover:text-white hover:scale-110 active:scale-95 transition-all group"
                title={darkMode ? "Pasar a modo claro" : "Pasar a modo oscuro"}
              >
                {darkMode ? (
                  /* Sol estilizado */
                  <svg className="w-6 h-6 transition-transform duration-500 rotate-0 group-hover:rotate-45" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                className="select-none flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/25 transition-colors"
              >
                <p className="text-sm font-bold text-black/75 dark:text-white">{currentUser.username ?? 'Usuario'}</p>
                <div className="w-10 h-10 bg-[#E5007D] rounded-full flex items-center justify-center text-white font-bold shadow-md shadow-pink-500/40 border-2 border-white/40">
                  {(currentUser.username?.[0] ?? 'U').toUpperCase()}
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl z-[100] overflow-hidden dark:bg-slate-800 ">
                  <button
                    onClick={openProfilePage}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    Administrar perfil
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-700" />
                  <button
                    onClick={openLogoutModalFromMenu}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>

          </header>
        )}

        {/* ÁREA DE TRABAJO */}
        <section className={`${isMobile ? 'p-0' : 'p-8'} ${shouldScrollInicioForRole ? 'overflow-y-auto overflow-x-hidden custom-scrollbar' : 'overflow-hidden'} flex-1 flex flex-col relative`}>
          {/* Capa de fondo con blur */}
          <div className="absolute inset-0 bg-center bg-no-repeat blur-[5px] scale-[1.05] -z-6 pointer-events-none opacity-40 dark:opacity-40" />

          <div
            key={activePage}
            className={`animate-slide-up relative z-10 ${shouldScrollInicioForRole ? 'h-full min-h-0 flex flex-col pb-6' : 'flex-1 flex flex-col min-h-0'} ${!shouldScrollInicioForRole && isMobile && activePage === 'inicio' ? 'overflow-y-auto' : ''}`}
          >
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
          <div className="glass-card-solid rounded-3xl p-8 max-w-sm w-full relative z-10 shadow-2xl animate-scale-in">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-center text-slate-800 dark:text-white mb-2">¿Cerrar sesión?</h3>
            <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
              Tendrás que volver a introducir tus credenciales.
            </p>
            <div className="select-none flex gap-3">
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
