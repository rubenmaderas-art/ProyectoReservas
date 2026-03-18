import { useState, useEffect, useRef, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch, faEye, faXmark, faChevronLeft, faChevronRight,
  faCalendarAlt, faFilter, faClock
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import useIsMobile from '../hooks/useIsMobile';

// --- Modal de Detalles ---
const DetailModal = ({ audit, isOpen, onClose, darkMode }) => {
  if (!isOpen || !audit) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[200] p-4">
      <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        {/* Header */}
        <div className={`sticky top-0 flex items-center justify-between p-6 border-b ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Detalles de Auditoría
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            <FontAwesomeIcon icon={faXmark} className="text-lg" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>ID</p>
              <p className={`text-sm font-mono ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{audit.id_auditoria}</p>
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Usuario</p>
              <p className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{audit.username || 'Sistema'}</p>
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Acción</p>
              <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`}>
                {audit.accion}
              </span>
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tabla</p>
              <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{audit.tabla_afectada}</p>
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Registro ID</p>
              <p className={`text-sm font-mono ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{audit.registro_id || '-'}</p>
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Rol</p>
              <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{audit.rol_momento}</p>
            </div>
          </div>

          <div>
            <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-2`}>Fecha</p>
            <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'} flex items-center gap-2`}>
              {new Date(audit.fecha).toLocaleString('es-ES')}
            </p>
          </div>

          {audit.detalles_admin && (
            <div>
              <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-2`}>Detalles</p>
              <pre className={`p-3 rounded-lg text-xs overflow-x-auto ${darkMode ? 'bg-slate-900 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-300'}`}>
                {typeof audit.detalles_admin === 'string'
                  ? audit.detalles_admin
                  : JSON.stringify(audit.detalles_admin, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function AuditLogView() {
  const isMobile = useIsMobile();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting Config
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleItems, setVisibleItems] = useState(10);
  const itemsPerPage = isMobile ? 6 : 8;
  const scrollObserverRef = useRef(null);

  // Detectar dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const storedTheme = localStorage.getItem('theme');
      const htmlHasDarkClass = document.documentElement.classList.contains('dark');
      setDarkMode(storedTheme === 'dark' || htmlHasDarkClass);
    };

    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('storage', checkDarkMode);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', checkDarkMode);
    };
  }, []);

  // Cargar logs
  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('No hay sesión activa');
        return;
      }

      const response = await fetch('http://localhost:4000/api/audit/logs?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Error al cargar auditoría');
      }

      const data = await response.json();
      setLogs(data.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Reset pagination cuando cambia búsqueda
  useEffect(() => {
    setCurrentPage(1);
    setVisibleItems(10);
  }, [searchTerm, actionFilter, tableFilter, startDate, endDate]);

  // Filtrar y ordenar
  const filteredLogs = useMemo(() => {
    let filtered = [...logs];

    // Búsqueda por usuario
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(log =>
        log.username?.toLowerCase().includes(query) ||
        log.tabla_afectada?.toLowerCase().includes(query)
      );
    }

    // Filtro por acción
    if (actionFilter) {
      filtered = filtered.filter(log => log.accion === actionFilter);
    }

    // Filtro por tabla
    if (tableFilter) {
      filtered = filtered.filter(log => log.tabla_afectada === tableFilter);
    }

    // Filtro por fecha
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(log => new Date(log.fecha) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(log => new Date(log.fecha) <= end);
    }

    // Ordenar
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (sortConfig.key === 'fecha') {
          const aTime = new Date(aValue).getTime();
          const bTime = new Date(bValue).getTime();
          return sortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
        }

        const aString = String(aValue).toLowerCase();
        const bString = String(bValue).toLowerCase();

        if (aString < bString) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aString > bString) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [logs, searchTerm, actionFilter, tableFilter, startDate, endDate, sortConfig]);

  // Paginación
  const paginatedLogs = useMemo(() => {
    if (isMobile) {
      return filteredLogs.slice(0, visibleItems);
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, isMobile, visibleItems, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  // Infinite scroll en móvil
  useEffect(() => {
    if (!isMobile) return;

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visibleItems < filteredLogs.length) {
        setVisibleItems(prev => prev + 10);
      }
    }, { threshold: 0.1 });

    if (scrollObserverRef.current) observer.observe(scrollObserverRef.current);
    return () => observer.disconnect();
  }, [isMobile, visibleItems, filteredLogs.length]);

  const handleViewDetails = (audit) => {
    setSelectedAudit(audit);
    setIsDetailOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActionFilter('');
    setTableFilter('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <div className={`p-3 border-b rounded-t-3xl ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Registro de Auditoría
        </h2>

        <div className="flex gap-3 mb-4 flex-wrap">
          {/* Barra de búsqueda */}
          <div className="flex-1 min-w-[250px]  relative">
            <FontAwesomeIcon icon={faSearch} className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Buscar por usuario o tabla..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl border transition-all ${darkMode
                ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500'
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            />
          </div>

          {/* Filtro por acción */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className={`px-4 py-2.5 rounded-xl border transition-all ${darkMode
              ? 'bg-slate-700 border-slate-600 text-white focus:border-blue-500'
              : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
          >
            <option value="">Todas las acciones</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="READ">READ</option>
          </select>

          {/* Filtro por tabla */}
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className={`px-4 py-2.5 rounded-xl border transition-all ${darkMode
              ? 'bg-slate-700 border-slate-600 text-white focus:border-blue-500'
              : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
          >
            <option value="">Todas las tablas</option>
            <option value="users">users</option>
            <option value="vehicles">vehicles</option>
            <option value="reservations">reservations</option>
            <option value="documents">documents</option>
            <option value="validations">validations</option>
            <option value="audit_logs">audit_logs</option>
          </select>
        </div>

        {/* Filtros de fecha */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2 min-w-[200px]">
            <FontAwesomeIcon icon={faCalendarAlt} className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`flex-1 px-4 py-2.5 rounded-xl border transition-all ${darkMode
                ? 'bg-slate-700 border-slate-600 text-white focus:border-blue-500'
                : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            />
          </div>

          <div className="flex items-center gap-2 min-w-[200px]">
            <FontAwesomeIcon icon={faCalendarAlt} className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`flex-1 px-4 py-2.5 rounded-xl border transition-all ${darkMode
                ? 'bg-slate-700 border-slate-600 text-white focus:border-blue-500'
                : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            />
          </div>

          <button
            onClick={clearFilters}
            disabled={!searchTerm && !actionFilter && !tableFilter && !startDate && !endDate}
            className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${!searchTerm && !actionFilter && !tableFilter && !startDate && !endDate
              ? 'opacity-50 cursor-not-allowed'
              : ''
            } ${darkMode
              ? 'bg-slate-700 hover:bg-slate-600 text-white'
              : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
            }`}
          >
            <FontAwesomeIcon icon={faFilter} /> Limpiar
          </button>

          {/* Info de resultados */}
          <div className={`mt-3 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Mostrando {paginatedLogs.length} registros
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className={`flex-1 overflow-auto ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className={`text-center ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-2"></div>
              Cargando auditoría...
            </div>
          </div>
        ) : paginatedLogs.length === 0 ? (
          <div className={`flex justify-center items-center h-full text-center p-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            No hay registros que mostrar
          </div>
        ) : isMobile ? (
          // Vista móvil - Cards
          <div className="p-4 space-y-3">
            {paginatedLogs.map((audit) => (
              <div
                key={audit.id_auditoria}
                className={`rounded-xl p-4 border ${darkMode
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {audit.username || 'Sistema'}
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {new Date(audit.fecha).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    audit.accion === 'CREATE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    audit.accion === 'UPDATE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    audit.accion === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {audit.accion}
                  </span>
                </div>
                <p className={`text-xs mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {audit.tabla_afectada}
                </p>
                <button
                  onClick={() => handleViewDetails(audit)}
                  className="w-full px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faEye} /> Ver detalles
                </button>
              </div>
            ))}
            {visibleItems < filteredLogs.length && (
              <div ref={scrollObserverRef} className="h-10 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
        ) : (
          // Vista desktop - Tabla
          <div className={`overflow-x-auto`}>
            <table className="w-full border-collapse">
              <thead className={`sticky top-0 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'border-slate-700' : 'border-slate-200'} border-b`}>
                    Usuario
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'border-slate-700' : 'border-slate-200'} border-b`}>
                    Acción
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'border-slate-700' : 'border-slate-200'} border-b`}>
                    Tabla
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'border-slate-700' : 'border-slate-200'} border-b`}>
                    Registro ID
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'border-slate-700' : 'border-slate-200'} border-b`}>
                    Fecha
                  </th>
                  <th className={`px-6 py-4 text-center text-xs font-bold uppercase tracking-wider ${darkMode ? 'border-slate-700' : 'border-slate-200'} border-b`}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((audit) => (
                  <tr
                    key={audit.id_auditoria}
                    className={`transition-colors ${darkMode
                      ? 'border-slate-700 hover:bg-slate-800'
                      : 'border-slate-200 hover:bg-slate-100'
                    } border-b`}
                  >
                    <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                      {audit.username || 'Sistema'}
                    </td>
                    <td className={`px-6 py-4 text-sm`}>
                      <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${
                        audit.accion === 'CREATE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        audit.accion === 'UPDATE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        audit.accion === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {audit.accion}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {audit.tabla_afectada}
                    </td>
                    <td className={`px-6 py-4 text-sm font-mono ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {audit.registro_id || '-'}
                    </td>
                    <td className={`px-6 py-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {new Date(audit.fecha).toLocaleString('es-ES')}
                    </td>
                    <td className={`px-6 py-4 text-sm text-center`}>
                      <button
                        onClick={() => handleViewDetails(audit)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                      >
                        <FontAwesomeIcon icon={faEye} /> Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación - Desktop */}
      {!isMobile && totalPages > 1 && (
        <div className={`flex items-center rounded-b-2xl justify-center gap-4 p-4 border-t ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg transition-all ${darkMode
              ? 'hover:bg-slate-700 disabled:opacity-50'
              : 'hover:bg-slate-100 disabled:opacity-50'
            }`}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>

          <div className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Página {currentPage} de {totalPages}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg transition-all ${darkMode
              ? 'hover:bg-slate-700 disabled:opacity-50'
              : 'hover:bg-slate-100 disabled:opacity-50'
            }`}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      )}

      {/* Modal */}
      <DetailModal
        audit={selectedAudit}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        darkMode={darkMode}
      />
    </div>
  );
}
