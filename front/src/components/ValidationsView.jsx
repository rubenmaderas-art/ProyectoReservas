import { useEffect, useState, useMemo, useRef } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faChevronLeft, faChevronRight, faCheck } from '@fortawesome/free-solid-svg-icons';

const ValidationsView = () => {
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sorting & Filter State
  const [sortConfig, setSortConfig] = useState({ key: "license_plate", direction: "asc" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const formatDate = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };


  useEffect(() => {
    localStorage.setItem("activeDashboardPage", "validaciones");
  }, []);

  // FILTRO + ORDENAMIENTO
  const sortedValidations = useMemo(() => {
    let sortableItems = [...validations];

    // FILTRO POR TEXTO
    if (searchTerm.trim() !== "") {
      const query = searchTerm.toLowerCase().trim();
      sortableItems = sortableItems.filter(
        (v) =>
          v.license_plate?.toLowerCase().includes(query) ||
          v.model?.toLowerCase().includes(query)
      );
    }

    if (filterStartDate || filterEndDate) {
      const start = filterStartDate ? new Date(filterStartDate) : null;
      const end = filterEndDate ? new Date(filterEndDate) : null;

      // Validación de fechas (no filtra si las fechas son inválidas)
      const isValidDate = (d) => d instanceof Date && !isNaN(d);

      sortableItems = sortableItems.filter((v) => {
        if (!v.created_at) return false;

        const d = new Date(v.created_at);
        if (!isValidDate(d)) return false;

        if (start && isValidDate(start) && d < start) return false;
        if (end && isValidDate(end) && d > end) return false;

        return true;
      });
    }

    // ORDENAMIENTO
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
        }

        const aString = String(aValue).toLowerCase();
        const bString = String(bValue).toLowerCase();

        if (aString < bString) return sortConfig.direction === "asc" ? -1 : 1;
        if (aString > bString) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return sortableItems;
  }, [validations, sortConfig, searchTerm, filterStartDate, filterEndDate]);

  const fetchValidations = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const res = await fetch("http://localhost:4000/api/dashboard/validations", { headers });

      if (res.ok) {
        const data = await res.json();
        setValidations(data);
      }
    } catch (e) {
      console.error("Error cargando validaciones:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValidations();
  }, []);


  const toLocalISOString = (date) => {
    const pad = (num) => String(num).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };


  // ── CUSTOM DATE TIME PICKER COMPONENT ──
  const CustomDateTimePicker = ({ value, onChange, label, error, align = "left" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value ? formatDate(value) : '');
    const containerRef = useRef(null);

    // Sincronizar el valor del input cuando cambia la prop 'value'
    useEffect(() => {
      if (value) {
        const formatted = formatDate(value);
        // Solo actualizamos el inputValue si es realmente diferente para no romper el cursor mientras se escribe
        setInputValue(prev => {
          const regex = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})[,\s]+(\d{1,2}):(\d{1,2})$/;
          if (prev.match(regex) && formatDate(value) === prev) return prev;
          return formatted;
        });
      }
    }, [value]);

    const selectedDate = value ? new Date(value) : new Date();

    const [viewDate, setViewDate] = useState(new Date(selectedDate));

    useEffect(() => {
      if (value && isOpen) setViewDate(new Date(value));
    }, [value, isOpen]);

    useEffect(() => {
      const handleClickOutside = (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

    const handleDateSelect = (day) => {
      const newDate = new Date(selectedDate);
      newDate.setFullYear(viewDate.getFullYear());
      newDate.setMonth(viewDate.getMonth());
      newDate.setDate(day);
      const localIso = toLocalISOString(newDate);
      onChange(localIso);
      setInputValue(formatDate(localIso));
    };

    const handleTimeChange = (type, val) => {
      const newDate = new Date(selectedDate);
      if (type === 'hour') newDate.setHours(parseInt(val));
      else newDate.setMinutes(parseInt(val));
      const localIso = toLocalISOString(newDate);
      onChange(localIso);
      setInputValue(formatDate(localIso));
    };

    const processInput = (val) => {
      const regex = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})[,\s]+(\d{1,2}):(\d{1,2})$/;
      const match = val.match(regex);
      if (match) {
        const [_, d, m, y, h, min] = match;
        const newDate = new Date(y, m - 1, d, h, min);
        if (!isNaN(newDate.getTime())) {
          const localIso = toLocalISOString(newDate);
          onChange(localIso);
          setInputValue(formatDate(localIso));
          return;
        }
      }
      // Si no es válido, revertimos al valor actual formateado
      if (value) setInputValue(formatDate(value));
    };

    // Manejar escritura manual (solo visual mientras escribe)
    const handleInputChange = (e) => {
      setInputValue(e.target.value);
    };

    const handleBlur = () => {
      processInput(inputValue);
    };

    const handleConfirm = () => {
      processInput(inputValue);
      setIsOpen(false);
    };

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const calendarDays = useMemo(() => {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const days = [];
      const totalDays = daysInMonth(year, month);
      const startDay = (firstDayOfMonth(year, month) + 6) % 7;

      for (let i = 0; i < startDay; i++) days.push(null);
      for (let i = 1; i <= totalDays; i++) days.push(i);
      return days;
    }, [viewDate]);

    return (
      <div className="relative" ref={containerRef}>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 ml-1">{label}</label>
        <label className={`relative group w-full flex items-center rounded-2xl border transition-all shadow-sm cursor-pointer
                  ${isOpen ? 'ring-4 ring-blue-500/10 border-blue-500 bg-white dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md'}
                  ${error ? 'border-red-400 ring-red-500/10' : ''}`}>

          <div className="pl-5 text-blue-500 opacity-60">
            <FontAwesomeIcon icon={faCalendarAlt} />
          </div>

          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={() => setIsOpen(true)}
            placeholder="DD/MM/AAAA"
            className="cursor-pointer w-full px-3 py-3 bg-transparent text-slate-900 dark:text-white outline-none font-medium placeholder:text-slate-300 dark:placeholder:text-slate-600"
          />
        </label>

        {isOpen && (
          <div className={`absolute z-[110] mt-2 p-5 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-[320px] animate-in fade-in zoom-in duration-200 
                      ${align === "right" ? "right-0" : "left-0"}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-colors">
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <h4 className="font-bold text-slate-800 dark:text-white">
                {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
              </h4>
              <button type="button" onClick={handleNextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-colors">
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                <span key={d} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{d}</span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 mb-5">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} />;
                const isSelected = selectedDate.getDate() === day &&
                  selectedDate.getMonth() === viewDate.getMonth() &&
                  selectedDate.getFullYear() === viewDate.getFullYear();
                const isToday = new Date().getDate() === day &&
                  new Date().getMonth() === viewDate.getMonth() &&
                  new Date().getFullYear() === viewDate.getFullYear();

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    className={`aspect-square rounded-xl text-sm font-semibold transition-all flex items-center justify-center
                                          ${isSelected
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : isToday
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-700 mb-5" />

            {/* Time Selection */}
            <div className="flex items-center gap-4">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-2">Hora</span>
                <select
                  value={selectedDate.getHours()}
                  onChange={(e) => handleTimeChange('hour', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-sm text-slate-800 dark:text-white outline-none focus:border-blue-500 transition-colors cursor-pointer"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>{i < 10 ? `0${i}` : i}</option>
                  ))}
                </select>
              </div>
              <span className="mt-5 font-bold text-slate-300 dark:text-slate-600">:</span>
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-2">Minuto</span>
                <select
                  value={Math.floor(selectedDate.getMinutes() / 5) * 5}
                  onChange={(e) => handleTimeChange('minute', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-sm text-slate-800 dark:text-white outline-none focus:border-blue-500 transition-colors cursor-pointer"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i * 5} value={i * 5}>{i * 5 < 10 ? `0${i * 5}` : i * 5}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              className="w-full mt-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faCheck} className="text-xs" />
              Confirmar
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Validación de entregas</h2>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        {/* SIEMPRE mostrar filtros */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 flex-1 min-w-[200px]">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white shrink-0">
              Validaciones
            </h2>

            <div className="relative flex-1 max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar por matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
              />
            </div>
          </div>




          {/* Contenedor de filtros de fecha */}
          <div className="flex flex-col md:flex-row gap-4 mb-5 items-end">
            <div className="flex-0.7 w-full">
              <CustomDateTimePicker
                label="Desde"
                value={filterStartDate}
                onChange={(val) => setFilterStartDate(val)}
                align="left"
              />
            </div>
            <div className="flex-0.7 w-full">
              <CustomDateTimePicker
                label="Hasta"
                value={filterEndDate}
                onChange={(val) => setFilterEndDate(val)}
                align="right"
              />
            </div>

            {/* Botón opcional para limpiar filtros */}
            {(filterStartDate || filterEndDate) && (
              <button
                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                className="px-4 py-3 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>







          <span className="text-sm font-medium px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg">
            {sortedValidations.length} resultados
          </span>
        </div>

        <div className="overflow-auto form-scrollbar">
          <table className="w-full text-sm text-left relative">
            <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">
                <th className="pb-3 px-4 text-center">Matrícula</th>
                <th className="pb-3 px-4 text-center">KM Entrega</th>
                <th className="pb-3 px-4 text-center">Fecha Registro</th>
                <th className="pb-3 px-4 text-center">Incidencia</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-400 italic">
                    Cargando...
                  </td>
                </tr>
              ) : sortedValidations.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-400 italic">
                    No hay validaciones que coincidan con el filtro.
                  </td>
                </tr>
              ) : (
                sortedValidations.map((v) => (
                  <tr key={v.id} className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 px-4 text-center">{v.license_plate}</td>
                    <td className="py-3 px-4 text-center">{v.km_entrega}</td>
                    <td className="py-3 px-4 text-center">
                      {new Date(v.created_at).toLocaleDateString("es-ES")}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold">
                      {v.incidencias ? "Sí" : "No"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default ValidationsView;