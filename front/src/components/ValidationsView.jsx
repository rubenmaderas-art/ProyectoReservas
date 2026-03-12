import { useState, useEffect, useRef, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt, faChevronLeft, faChevronRight,
  faSearch, faTrashAlt, faEye, faClock, faGaugeHigh
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

// --- HELPERS ORIGINALES ---
const formatDate = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

// --- VISTA PRINCIPAL ---
const ValidationsView = ({ openViewModal }) => {
  const isMobile = useIsMobile();
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  // Función para renderizar el icono de ordenación
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <span className="ml-1 opacity-20 text-[10px]">↕</span>;
    return sortConfig.direction === 'asc' ?
      <span className="ml-1 text-blue-500 text-[10px]">▲</span> :
      <span className="ml-1 text-blue-500 text-[10px]">▼</span>;
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
    // Filtrar primero
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

    // Ordenar después
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Manejo especial para fechas
        if (sortConfig.key === 'created_at') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        // Manejo para strings
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

            <div className="relative flex-1  max-w-sm">
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

      {/* CONTENIDO*/}
      <div className="flex-1 overflow-y-auto form-scrollbar pr-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 italic text-sm">Cargando...</div>
        ) : !isMobile ? (
          /* --- VISTA PC --- */
          <table className="w-full text-left relative border-collapse">
            <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">
                <th
                  className="py-4 px-4 text-center cursor-pointer hover:text-blue-500 transition-colors"
                  onClick={() => requestSort('username')}
                >
                  Usuario {getSortIcon('username')}
                </th>
                <th
                  className="py-4 px-4 text-center cursor-pointer hover:text-blue-500 transition-colors"
                  onClick={() => requestSort('license_plate')}
                >
                  Matrícula {getSortIcon('license_plate')}
                </th>
                <th
                  className="py-4 px-4 text-center cursor-pointer hover:text-blue-500 transition-colors"
                  onClick={() => requestSort('created_at')}
                >
                  Fecha Registro {getSortIcon('created_at')}
                </th>
                <th
                  className="py-4 px-4 text-center cursor-pointer hover:text-blue-500 transition-colors"
                  onClick={() => requestSort('incidencias')}
                >
                  Estado {getSortIcon('incidencias')}
                </th>
                <th className="py-4 px-4 text-center">Opciones</th>
              </tr>
            </thead>
            <tbody>
              {processedValidations.map((v) => (
                <tr key={v.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-4 text-center font-semibold text-sm text-slate-800 dark:text-slate-200">{v.username}</td>
                  <td className="py-4 px-4 text-center text-sm text-slate-600 dark:text-slate-400">
                    {v.model} <span className="font-bold uppercase ml-1">({v.license_plate})</span>
                  </td>
                  <td className="py-4 px-4 text-center text-sm text-slate-600 dark:text-slate-400">{formatDate(v.created_at)}</td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex justify-center">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${v.incidencias ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 px-4 py-1.5 rounded-full text-xs font-semibold' : 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30 px-4 py-1.5 rounded-full text-xs font-semibold'}`}>
                        {v.incidencias ? 'Incidencia' : 'OK'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => openViewModal(v)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(v.id)}
                        title="Eliminar validación"
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
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
          /* --- VISTA MÓVIL (LAS TARJETAS QUE TE GUSTARON) --- */
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
                      {v.incidencias ? 'Incidencia' : 'OK'}
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
                      onClick={() => openViewModal(v)}
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
