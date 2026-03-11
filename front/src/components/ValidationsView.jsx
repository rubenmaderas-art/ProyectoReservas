import { useState, useEffect, useRef, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt, faChevronLeft, faChevronRight,
  faSearch, faTrashAlt, faEye
} from '@fortawesome/free-solid-svg-icons';

// --- HELPERS ---
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
                    ${isOpen
              ? 'border-blue-500 bg-white dark:bg-slate-800'
              : 'border-slate-300 dark:border-slate-700 bg-transparent hover:border-slate-400 dark:hover:border-slate-600'}`}
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
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors">
              <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
            </button>
            <h4 className="font-bold text-xs uppercase tracking-tighter text-slate-800 dark:text-white">
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
            </h4>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors">
              <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
            </button>
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
                  className={`aspect-square rounded-lg text-xs font-bold flex items-center justify-center transition-all
                                ${selectedDate.getDate() === day && selectedDate.getMonth() === viewDate.getMonth()
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
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

// --- MAIN VIEW ---
const ValidationsView = ({ openViewModal }) => {
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const fetchValidations = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const res = await fetch("http://localhost:4000/api/dashboard/validations", { headers });
      if (res.ok) setValidations(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchValidations(); }, []);

  const filteredValidations = useMemo(() => {
    return validations.filter(v => {
      // Convertimos todo a minúsculas para que no importe si escribes en Mayus o Minus
      const search = searchTerm.toLowerCase();

      // Campos de búsqueda
      const matchUsername = v.username?.toLowerCase().includes(search);
      const matchPlate = v.license_plate?.toLowerCase().includes(search);
      const matchModel = v.model?.toLowerCase().includes(search);

      // Filtro de búsqueda
      const matchesSearch = matchUsername || matchPlate || matchModel;

      // Filtro de fechas
      const date = new Date(v.created_at);
      const matchStart = filterStartDate ? date >= new Date(filterStartDate) : true;
      const matchEnd = filterEndDate ? date <= new Date(filterEndDate) : true;

      return matchesSearch && matchStart && matchEnd;
    });
  }, [validations, searchTerm, filterStartDate, filterEndDate]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-6 mb-8 shrink-0">
        <div className="flex items-center gap-6 flex-1 min-w-[600px]">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white shrink-0 mb-1">Validaciones</h2>

          {/* BÚSQUEDA */}
          <div className="relative flex-1 max-w-[400px]">
            <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm" />
            <input
              type="text"
              placeholder="Buscar por usuario, vehículo o matrícula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all dark:text-white dark:placeholder-slate-500 outline-none"
            />
          </div>

          {/* FILTROS DE FECHA */}
          <div className="flex items-center gap-4 shrink-0">
            <CustomDateTimePicker label="Desde" value={filterStartDate} onChange={setFilterStartDate} align="left" />
            <CustomDateTimePicker label="Hasta" value={filterEndDate} onChange={setFilterEndDate} align="right" />
          </div>
        </div>

        {/* CONTADOR*/}
        <div className="flex items-center shrink-0 mb-1">
          <div className="bg-slate-200 dark:bg-slate-800 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400">
            {filteredValidations.length} validaciones
          </div>
        </div>
      </div>

      {/* TABLA DE CONTENIDO */}
      <div className="flex-1 overflow-y-auto form-scrollbar pr-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
            <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="italic text-sm font-medium">Cargando flota...</p>
          </div>
        ) : filteredValidations.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 dark:text-slate-400 font-medium">No se encontraron resultados.</p>
          </div>
        ) : (
          <table className="w-full text-left relative border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10">
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold tracking-wider">
                <th className="py-4 px-4 uppercase text-center">Cliente</th>
                <th className="py-4 px-4 uppercase text-center">Vehículo</th>
                <th className="py-4 px-4 uppercase text-center">Fecha Registro</th>
                <th className="py-4 px-4 uppercase text-center">Estado</th>
                <th className="py-4 px-4 uppercase text-center">Opciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredValidations.map((v) => (
                <tr key={v.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">

                  <td className="py-4 px-4 text-center font-semibold text-sm text-slate-800 dark:text-slate-200">
                    {v.username || 'Usuario Desconocido'}
                  </td>

                  <td className="py-4 px-4 text-center text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-medium">{v.model}</span>
                    <span className="font-bold uppercase ml-2 text-blue-500 dark:text-blue-400">
                      {v.license_plate}
                    </span>
                  </td>

                  {/* FECHA REGISTRO */}
                  <td className="py-4 px-4 text-center text-sm text-slate-600 dark:text-slate-400">
                    {formatDate(v.created_at)}
                  </td>

                  {/* ESTADO (INCIDENCIAS) */}
                  <td className="py-4 px-4 text-center">
                    <div className="flex justify-center">
                      {v.incidencias ? (
                        <span className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 px-4 py-1.5 rounded-full text-xs font-semibold">
                          Incidencia
                        </span>
                      ) : (
                        <span className="bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30 px-4 py-1.5 rounded-full text-xs font-semibold">
                          OK
                        </span>
                      )}
                    </div>
                  </td>

                  {/* BOTONES DE ACCIÓN */}
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => openViewModal(v)} className="text-slate-400 hover:text-blue-500 transition-colors">
                        <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                      </button>
                      <button className="text-slate-400 hover:text-red-500 transition-colors">
                        <FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ValidationsView;