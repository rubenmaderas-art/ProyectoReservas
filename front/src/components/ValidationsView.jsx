import { useState, useEffect, useRef, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt, faChevronLeft, faChevronRight,
  faSearch, faTrashAlt, faEye, faClock, faGaugeHigh,
  faCar, faIdCard, faCommentDots, faTriangleExclamation,
  faCircleCheck, faBan, faXmark, faUser
} from '@fortawesome/free-solid-svg-icons';

// --- HOOK PARA DETECTAR MÓVIL ---
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
};

// --- HELPERS ---
const formatDate = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const toLocalISOString = (date) => {
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// --- CUSTOM DATE TIME PICKER ---
const CustomDateTimePicker = ({ value, onChange, label, align = "left" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const days = useMemo(() => {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    const d = [];
    const total = new Date(y, m + 1, 0).getDate();
    const start = (new Date(y, m, 1).getDay() + 6) % 7;
    for (let i = 0; i < start; i++) d.push(null);
    for (let i = 1; i <= total; i++) d.push(i);
    return d;
  }, [viewDate]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex flex-col space-y-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</label>
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-all cursor-pointer min-w-[160px]
                    ${isOpen ? 'border-blue-500 bg-white dark:bg-slate-800' : 'border-slate-300 dark:border-slate-700 bg-transparent'}`}
        >
          <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-500 text-sm" />
          <span className={`text-sm font-medium ${value ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
            {value ? formatDate(value).split(' ')[0] : "DD/MM/AAAA"}
          </span>
        </div>
      </div>

      {isOpen && (
        <div className={`absolute z-[110] mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-[260px] ${align === "right" ? "right-0" : "left-0"}`}>
          <div className="flex items-center justify-between mb-4 px-1">
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" /></button>
            <h4 className="font-bold text-xs uppercase tracking-tighter">{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</h4>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><FontAwesomeIcon icon={faChevronRight} className="text-[10px]" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => (
              day ? (
                <button key={i} onClick={() => {
                  const nd = new Date(selectedDate);
                  nd.setFullYear(viewDate.getFullYear(), viewDate.getMonth(), day);
                  onChange(toLocalISOString(nd));
                  setIsOpen(false);
                }}
                  className={`aspect-square rounded-lg text-xs font-bold flex items-center justify-center transition-all ${selectedDate.getDate() === day && selectedDate.getMonth() === viewDate.getMonth() ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700 dark:text-slate-300'}`}>
                  {day}
                </button>
              ) : <div key={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- MODAL DE DETALLE DE VALIDACIÓN ---
const ValidationDetailModal = ({ validation, onClose }) => {
  const [kmValue, setKmValue] = useState('');
  const [comentario, setComentario] = useState('');
  const [incidencia, setIncidencia] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleVehicleStatus = async (newStatus) => {
    setIsSaving(true);
    try {
      // Si el supervisor deja vacío kmValue, usamos el km_entrega del usuario, o el km_inicial si ambos fallan.
      let kmFinal = null;
      if (kmValue.trim() !== '') {
        kmFinal = parseInt(kmValue, 10);
      } else if (validation.km_entrega !== undefined && validation.km_entrega !== null) {
        kmFinal = parseInt(validation.km_entrega, 10);
      }

      // Buscar el vehículo por matrícula para obtener su ID
      const vehiclesRes = await fetch('http://localhost:4000/api/dashboard/vehicles', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (vehiclesRes.ok) {
        const vehicles = await vehiclesRes.json();
        const vehicle = Array.isArray(vehicles)
          ? vehicles.find(v => v.license_plate === validation.license_plate)
          : null;

        if (vehicle) {
          // Asegurarnos de que el valor final (o vehículo) no es menor que km_inicial
          const baselineKm = validation.km_inicial ?? vehicle.kilometers ?? 0;
          let updatedKm = kmFinal !== null && !isNaN(kmFinal) ? Math.max(kmFinal, baselineKm) : baselineKm;

          await fetch(`http://localhost:4000/api/dashboard/vehicles/${vehicle.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              ...vehicle,
              status: newStatus,
              kilometers: updatedKm,
            })
          });

          // Si pasa a "no-disponible", rechazar todas las reservas pendientes/aprobadas/activas
          if (newStatus === 'no-disponible') {
            const reservationsRes = await fetch('http://localhost:4000/api/dashboard/reservations', {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (reservationsRes.ok) {
              const allReservations = await reservationsRes.json();
              const nonTerminalStatuses = ['pendiente', 'aprobada', 'activa'];
              const toReject = Array.isArray(allReservations)
                ? allReservations.filter(r =>
                    String(r.vehicle_id) === String(vehicle.id) &&
                    nonTerminalStatuses.includes(String(r.status).toLowerCase())
                  )
                : [];

              await Promise.all(toReject.map(r =>
                fetch(`http://localhost:4000/api/dashboard/reservations/${r.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify({
                    user_id: r.user_id,
                    vehicle_id: r.vehicle_id,
                    start_time: r.start_time,
                    end_time: r.end_time,
                    status: 'rechazada',
                  })
                })
              ));
            }
          }
        }
      }

      onClose();
    } catch (e) {
      console.error('Error actualizando vehículo:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-xl animate-modal-overlay"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg relative z-10 shadow-2xl animate-scale-in border border-slate-200 dark:border-slate-700 overflow-hidden">

        {/* Header */}
        <div className="relative dark:border-slate-700 bg-white dark:bg-slate-800/50 px-7 pt-7 pb-2 ">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
          <p className="text-blue-100 text-xs font-semibold uppercase tracking-widest mb-1">Detalle de validación</p>
          <h3 className="text-white text-xl font-bold leading-tight">
            {validation.model}
          </h3>
          <p className="text-blue-200 text-sm font-mono mt-0.5">{validation.license_plate}</p>
        </div>

        {/* Body */}
        <div className="px-7 pb-7 pt-3">
          {/* Mensaje del usuario */}
          <div className="mb-5">
            <label className="flex items-center gap-2 text-md tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Mensaje del usuario
            </label>
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                {validation.informe_entrega
                  ? `"${validation.informe_entrega}"`
                  : <span className="text-slate-400 dark:text-slate-500 not-italic">Sin mensaje de entrega.</span>
                }
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 not-italic">
                — {validation.username} · {formatDate(validation.created_at)}
              </p>
            </div>
          </div>

          {/* Kilómetros */}
          <div className="mb-5">
            <label className="flex items-center gap-2 text-md tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Kilómetros del vehículo
            </label>
            <input
              type="number"
              min={validation.km_inicial ?? 0}
              step="1"
              value={kmValue}
              onChange={(e) => setKmValue(e.target.value)}
              placeholder={`Del usuario: ${validation.km_entrega ?? 0} km.`}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 ml-1">
              Si se deja vacío, tomará el kilometraje indicado por el usuario ({validation.km_entrega ?? 0} km). Km anteriores a la reserva {validation.km_inicial} km)
            </p>
          </div>

          {/* Comentario del cargo superior */}
          <div className="mb-5">
            <label className="flex items-center gap-2 text-md tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Tu comentario
            </label>
            <textarea
              rows={3}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Escribe aquí tu comentario sobre la entrega del vehículo..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Checkbox Incidencia */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer select-none group w-fit">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={incidencia}
                  onChange={(e) => setIncidencia(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  incidencia
                    ? 'bg-red-500 border-red-500'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-red-400'
                }`}>
                  {incidencia && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className={`text-sm font-semibold transition-colors ${incidencia ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300 group-hover:text-red-500'}`}>
                <FontAwesomeIcon icon={faTriangleExclamation} className="mr-1.5 text-xs" />
                Incidencia
              </span>
            </label>
          </div>

          {/* Label + botones de estado */}
          <div className="border-t border-slate-100 dark:border-slate-700 pt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              El vehículo debe pasar a:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleVehicleStatus('no-disponible')}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-red-500/10 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                <FontAwesomeIcon icon={faBan} />
                No disponible
              </button>
              <button
                onClick={() => handleVehicleStatus('disponible')}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 text-green-600 dark:text-green-400 font-bold text-sm hover:bg-green-100 dark:hover:bg-green-500/20 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-green-500/10 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                <FontAwesomeIcon icon={faCircleCheck} />
                Disponible
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- VISTA PRINCIPAL ---
const ValidationsView = () => {
  const isMobile = useIsMobile();
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Estado del modal de detalle
  const [selectedValidation, setSelectedValidation] = useState(null);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (!sortConfig || sortConfig.key !== key) {
        return (
            <svg className="w-3 h-3 ml-1 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
        );
    }
    return sortConfig.direction === 'asc' ? (
        <svg className="w-3 h-3 ml-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" />
        </svg>
    ) : (
        <svg className="w-3 h-3 ml-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
        </svg>
    );
  };

  useEffect(() => {
    const fetchValidations = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/dashboard/validations", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        if (res.ok) setValidations(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchValidations();
  }, []);

  // Bloquear scroll cuando algún modal está abierto
  useEffect(() => {
    if (deleteId || selectedValidation) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [deleteId, selectedValidation]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`http://localhost:4000/api/dashboard/validations/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Error al eliminar la validación');
      }

      setValidations((prev) => prev.filter((v) => String(v.id) !== String(deleteId)));
      setDeleteId(null);
    } catch (e) {
      console.error(e);
      alert(e?.message || 'Error al eliminar la validación');
    } finally {
      setIsDeleting(false);
    }
  };

  // --- LÓGICA DE FILTRADO Y ORDENACIÓN ---
  const processedValidations = useMemo(() => {
    let result = validations.filter(v => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = v.username?.toLowerCase().includes(search) ||
        v.license_plate?.toLowerCase().includes(search) ||
        v.model?.toLowerCase().includes(search);
      const date = new Date(v.created_at);
      const matchStart = filterStartDate ? date >= new Date(filterStartDate) : true;
      const matchEnd = filterEndDate ? date <= new Date(filterEndDate) : true;
      return matchesSearch && matchStart && matchEnd;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        if (sortConfig.key === 'created_at') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [validations, searchTerm, filterStartDate, filterEndDate, sortConfig]);

  return (
    <div className="relative h-full flex flex-col bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6 animate-fade-in transition-colors overflow-hidden">
      {isMobile ? (
        
        <div className="flex flex-col gap-4 mb-6 shrink-0">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white shrink-0">Validaciones</h2>
              <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg whitespace-nowrap">
                {processedValidations.length} validaciones
              </span>
            </div>

            <div className="relative self-end w-full">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"
              />
              <input
                type="text"
                placeholder="Buscar por usuario, vehículo o matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 justify-between">
            <CustomDateTimePicker label="Desde" value={filterStartDate} onChange={setFilterStartDate} align="left" />
            <CustomDateTimePicker label="Hasta" value={filterEndDate} onChange={setFilterEndDate} align="right" />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 shrink-0">
          <div className="flex self-end gap-4 flex-1 min-w-[200px]">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white shrink-0">Validaciones</h2>

            <div className="relative flex-1 max-w-sm">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Buscar por usuario, vehículo o matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <CustomDateTimePicker label="Desde" value={filterStartDate} onChange={setFilterStartDate} align="left" />
            <CustomDateTimePicker label="Hasta" value={filterEndDate} onChange={setFilterEndDate} align="right" />
            <span className="text-sm font-medium px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg">
              {processedValidations.length} validaciones
            </span>
          </div>
        </div>
      )}

      {/* CONTENIDO */}
      <div className="flex-1 overflow-x-auto form-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
             <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin mb-4"></div>
             <p className="italic">Cargando validaciones...</p>
          </div>
        ) : !isMobile ? (
          /* --- VISTA PC --- */
          <table className="w-full text-sm text-left relative">
            <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">
                <th onClick={() => requestSort('username')} className="pb-3 px-4 text-center cursor-pointer hover:text-blue-600 transition-colors group">
                    <div className="flex items-center justify-center">
                        Usuario {getSortIcon('username')}
                    </div>
                </th>
                <th onClick={() => requestSort('license_plate')} className="pb-3 px-4 text-center cursor-pointer hover:text-blue-600 transition-colors group">
                    <div className="flex items-center justify-center">
                        Matrícula {getSortIcon('license_plate')}
                    </div>
                </th>
                <th onClick={() => requestSort('created_at')} className="pb-3 px-4 text-center cursor-pointer hover:text-blue-600 transition-colors group">
                    <div className="flex items-center justify-center">
                        Fecha Registro {getSortIcon('created_at')}
                    </div>
                </th>
                <th onClick={() => requestSort('incidencias')} className="pb-3 px-4 text-center cursor-pointer hover:text-blue-600 transition-colors group">
                    <div className="flex items-center justify-center">
                        Estado {getSortIcon('incidencias')}
                    </div>
                </th>
                <th className="pb-3 px-4 text-center">
                    <div className="flex items-center justify-center">
                        Opciones
                    </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {processedValidations.map((v) => (
                <tr key={v.id} className="border-b border-slate-200/70 dark:border-slate-700/60 odd:bg-slate-50 even:bg-white dark:odd:bg-slate-800/40 dark:even:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-200">{v.username}</td>
                  <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-300">
                    <span className="font-semibold">{v.model}</span> <span className="uppercase ml-1 text-xs">({v.license_plate})</span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-300">{formatDate(v.created_at)}</td>
                  <td className="py-3 px-4 text-center">
                      <div className="flex justify-center">
                          <span className={`chip-uniform px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${v.incidencias ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'}`}>
                              {v.incidencias ? 'Incorrecto' : 'Correcto'}
                          </span>
                      </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedValidation(v)}
                        title="Ver detalle"
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors mr-1"
                      >
                        <FontAwesomeIcon icon={faEye} className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(v.id)}
                        title="Eliminar validación"
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* --- VISTA MÓVIL --- */
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {processedValidations.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400 font-medium">No hay validaciones registradas</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Las validaciones aparecerán aquí al finalizar reservas.</p>
              </div>
            ) : (
              processedValidations.map((v) => (
                <div
                  key={v.id}
                  className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 shadow-sm hover:border-blue-300 dark:hover:border-blue-800 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{v.username}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-1">
                        {v.model} <span className="font-bold uppercase ml-1">({v.license_plate})</span>
                      </p>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${v.incidencias ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30' : 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30'}`}>
                      {v.incidencias ? 'Incorrecto' : 'Correcto'}
                    </span>
                  </div>

                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                      <FontAwesomeIcon icon={faGaugeHigh} className="w-3.5 h-3.5 text-blue-500" />
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Kilómetros entrega</span>
                        <span className="text-xs font-semibold">{v.km_entrega} km</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                      <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5 text-amber-500" />
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Fecha registro</span>
                        <span className="text-xs font-semibold">{formatDate(v.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-slate-50 dark:border-slate-700/50 gap-2">
                    <button
                      onClick={() => setSelectedValidation(v)}
                      className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors text-xs font-bold flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                      Ver detalle
                    </button>
                    <button
                      onClick={() => setDeleteId(v.id)}
                      title="Eliminar validación"
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* MODAL DETALLE DE VALIDACIÓN */}
      {selectedValidation && (
        <ValidationDetailModal
          validation={selectedValidation}
          onClose={() => setSelectedValidation(null)}
        />
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      {deleteId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-xl animate-modal-overlay"
            onClick={() => !isDeleting && setDeleteId(null)}
          />
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full relative z-10 shadow-2xl animate-scale-in border border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-center text-slate-800 dark:text-white mb-2">¿Estás seguro?</h3>
            <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
              Esta acción eliminará la validación permanentemente y no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-70"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-70 flex items-center justify-center"
              >
                {isDeleting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Sí, eliminar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationsView;
