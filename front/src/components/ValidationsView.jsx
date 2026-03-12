import { useState, useEffect, useRef, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt, faChevronLeft, faChevronRight,
  faSearch, faTrashAlt, faEye, faCar, faClock, faGaugeHigh
} from '@fortawesome/free-solid-svg-icons';

// --- HOOK PARA DETECTAR MÓVIL (Sin cambiar estilos de PC) ---
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

// --- CUSTOM DATE TIME PICKER (DISEÑO PC ORIGINAL) ---
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

  const filteredValidations = useMemo(() => {
    return validations.filter(v => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = v.username?.toLowerCase().includes(search) ||
        v.license_plate?.toLowerCase().includes(search) ||
        v.model?.toLowerCase().includes(search);
      const date = new Date(v.created_at);
      const matchStart = filterStartDate ? date >= new Date(filterStartDate) : true;
      const matchEnd = filterEndDate ? date <= new Date(filterEndDate) : true;
      return matchesSearch && matchStart && matchEnd;
    });
  }, [validations, searchTerm, filterStartDate, filterEndDate]);


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
      {/* HEADER (FORMATO PC INTACTO) */}
      <div className={`flex flex-wrap items-end justify-between gap-6 mb-8 shrink-0 ${isMobile ? 'flex-col items-start' : ''}`}>
        <div className={`flex items-center gap-6 flex-1 ${isMobile ? 'flex-col w-full' : 'min-w-[600px]'}`}>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white shrink-0">Validaciones</h2>

          <div className={`relative flex-1 ${isMobile ? 'w-full' : 'max-w-[400px]'}`}>
            <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Buscar por usuario, vehículo o matrícula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
            />
          </div>

          <div className={`flex items-center gap-4 ${isMobile ? 'w-full justify-between' : 'shrink-0'}`}>
            <CustomDateTimePicker label="Desde" value={filterStartDate} onChange={setFilterStartDate} align="left" />
            <CustomDateTimePicker label="Hasta" value={filterEndDate} onChange={setFilterEndDate} align="right" />
          </div>
        </div>

        {!isMobile && (
          <div className="bg-slate-200 dark:bg-slate-800 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            {filteredValidations.length} validaciones
          </div>
        )}
      </div>

      {/* CONTENIDO (HÍBRIDO: TABLA O TARJETAS) */}
      <div className="flex-1 overflow-y-auto form-scrollbar pr-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 italic text-sm">Cargando...</div>
        ) : !isMobile ? (
          /* --- VISTA PC (TABLA ORIGINAL CLONADA) --- */
          <table className="w-full text-left relative border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10">
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold tracking-wider uppercase">
                <th
                  className="py-4 px-4 text-center cursor-pointer hover:text-blue-500 transition-colors"
                  onClick={() => requestSort('username')}
                >
                  Cliente {getSortIcon('username')}
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
                      <button onClick={() => openViewModal(v)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><FontAwesomeIcon icon={faEye} className="w-4 h-4" /></button>
                      <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* --- VISTA MÓVIL (LAS TARJETAS QUE TE GUSTARON) --- */
          <div className="flex flex-col gap-5 pt-2">
            {filteredValidations.map(v => (
              <div key={v.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-700 relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">{v.username}</h3>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${v.incidencias ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 px-4 py-1.5 rounded-full text-xs font-semibold' : 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30 px-4 py-1.5 rounded-full text-xs font-semibold'}`}>
                    {v.incidencias ? 'Incidencia' : 'OK'}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-5 mb-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                    <FontAwesomeIcon icon={faCar} className="text-xl" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-blue-600 uppercase tracking-widest">{v.license_plate}</span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{v.model}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="flex items-center gap-2.5 px-2">
                    <FontAwesomeIcon icon={faGaugeHigh} className="text-slate-300 text-sm" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{v.km_entrega} <small className="text-[9px] text-slate-400 uppercase">KM</small></span>
                  </div>
                  <div className="flex items-center gap-2.5 px-2">
                    <FontAwesomeIcon icon={faClock} className="text-slate-300 text-sm" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{formatDate(v.created_at).split(' ')[0]}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                  <button onClick={() => openViewModal(v)} className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg">Ver Detalle</button>
                  <button className="w-14 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center"><FontAwesomeIcon icon={faTrashAlt} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidationsView;