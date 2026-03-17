import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import useIsMobile from '../hooks/useIsMobile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faClock, faChevronLeft, faChevronRight, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import {
    isVehicleReservable,
    normalizeVehicleStatus,
} from '../utils/statusConcordance';
import { planReservationTimeBasedUpdates } from '../utils/reservationAutoStatus';

const INITIAL_FORM_STATE = { user_id: '', vehicle_id: '', start_time: '', end_time: '', status: 'pendiente' };
const RESERVATION_STATUS_OPTIONS = ['pendiente', 'aprobada', 'activa', 'finalizada', 'rechazada'];

const STATUS_STYLES = {
    'aprobada': 'bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30',
    'activa': 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
    'finalizada': 'bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30',
    'rechazada': 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
    'pendiente': 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
    'fecha': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const formatDate = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};


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
const CustomDateTimePicker = ({ value, onChange, label, align = "left", disabled = false }) => {
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

    const handleTimeChange = (type, val) => {
        const newDate = new Date(selectedDate);
        if (type === 'hour') newDate.setHours(parseInt(val));
        else newDate.setMinutes(parseInt(val));
        onChange(toLocalISOString(newDate));
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="flex flex-col space-y-2 w-full">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-1">{label}</label>
                <div
                    onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 transition-all w-full
                        ${disabled ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 opacity-70 cursor-not-allowed' : (isOpen ? 'ring-4 ring-blue-500/10 border-blue-500 bg-white dark:bg-slate-800 cursor-pointer shadow-md' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md cursor-pointer')}`}
                >
                    <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-500 text-sm" />
                    <span className={`text-sm font-medium ${value ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                        {value ? formatDate(value) : "DD/MM/AAAA"}
                    </span>
                </div>
            </div>

            {isOpen && (
                <div className={`absolute z-[110] mt-2 p-5 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-[280px] animate-in fade-in zoom-in duration-200 
                    ${align === "right" ? "right-0" : "left-0"}`}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 px-1">
                        <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-colors">
                            <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
                        </button>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                            {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
                        </h4>
                        <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-colors">
                            <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
                        </button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] font-bold text-slate-400 uppercase">
                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <span key={d}>{d}</span>)}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1 mb-5">
                        {days.map((day, i) => (
                            day ? (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                        const nd = new Date(selectedDate);
                                        nd.setFullYear(viewDate.getFullYear(), viewDate.getMonth(), day);
                                        onChange(toLocalISOString(nd));
                                    }}
                                    className={`aspect-square rounded-xl text-xs font-bold flex items-center justify-center transition-all
                                        ${selectedDate.getDate() === day && selectedDate.getMonth() === viewDate.getMonth() && selectedDate.getFullYear() === viewDate.getFullYear()
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                >
                                    {day}
                                </button>
                            ) : <div key={i} />
                        ))}
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-slate-700 mb-5" />

                    {/* Time Selection */}
                    <div className="flex items-center gap-4 mb-5">
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
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-2">Min</span>
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
                        onClick={() => setIsOpen(false)}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                    >
                        Confirmar
                    </button>
                </div>
            )}
        </div>
    );
};

export default function ReservationsView({
    shouldOpenAddModal,
    onAddModalOpened,
    reservationToEdit,
    onEditModalOpened,
    reservationToDeleteId,
    onDeleteActionHandled,
    headless = false,
    allowPageFlow = false,
    onOperationComplete
}) {
    const isMobile = useIsMobile();
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal/Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [editingId, setEditingId] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');
    const [deleteId, setDeleteId] = useState(null);
    const renderToBody = (node) => (
        typeof document !== 'undefined' ? createPortal(node, document.body) : null
    );
    const shouldKeepHeaderVisible = headless && isMobile && currentUser.role === 'empleado';

    // Trigger: Agregar nueva
    useEffect(() => {
        if (shouldOpenAddModal) {
            handleOpenModal();
            if (onAddModalOpened) onAddModalOpened();
        }
    }, [shouldOpenAddModal]);

    // Trigger: Editar existente
    useEffect(() => {
        if (reservationToEdit) {
            handleOpenModal(reservationToEdit);
            if (onEditModalOpened) onEditModalOpened();
        }
    }, [reservationToEdit]);

    // Trigger: Borrar existente
    useEffect(() => {
        if (reservationToDeleteId) {
            handleDeleteClick(reservationToDeleteId);
            if (onDeleteActionHandled) onDeleteActionHandled();
        }
    }, [reservationToDeleteId]);

    // Bloquear scroll de fondo (incluyendo pull-down en móvil) al abrir modal
    useEffect(() => {
        const shouldLock = isModalOpen || deleteId;
        if (!shouldLock || typeof window === 'undefined') return;

        const body = document.body;
        const html = document.documentElement;
        const scrollY = window.scrollY;

        const prevStyles = {
            bodyOverflow: body.style.overflow,
            bodyPosition: body.style.position,
            bodyTop: body.style.top,
            bodyWidth: body.style.width,
            bodyOverscrollBehavior: body.style.overscrollBehavior,
            htmlOverflow: html.style.overflow,
            htmlOverscrollBehavior: html.style.overscrollBehavior,
        };

        html.style.overflow = 'hidden';
        html.style.overscrollBehavior = 'none';
        body.style.overflow = 'hidden';
        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.width = '100%';
        body.style.overscrollBehavior = 'none';

        return () => {
            html.style.overflow = prevStyles.htmlOverflow;
            html.style.overscrollBehavior = prevStyles.htmlOverscrollBehavior;
            body.style.overflow = prevStyles.bodyOverflow;
            body.style.position = prevStyles.bodyPosition;
            body.style.top = prevStyles.bodyTop;
            body.style.width = prevStyles.bodyWidth;
            body.style.overscrollBehavior = prevStyles.bodyOverscrollBehavior;
            window.scrollTo(0, scrollY);
        };
    }, [isModalOpen, deleteId]);

    // Select Options State
    const [usersList, setUsersList] = useState([]);
    const [vehiclesList, setVehiclesList] = useState([]);
    const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const vehicleDropdownRef = useRef(null);
    const userDropdownRef = useRef(null);
    const statusDropdownRef = useRef(null);

    // Sorting & Filter State
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Paginación y Scroll Infinito
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const [visibleItems, setVisibleItems] = useState(10);
    const scrollObserverRef = useRef(null);

    const sortedReservations = useMemo(() => {
        // Definimos el margen de 5 días en milisegundos
        const FIVE_DAYS_IN_MS = 5 * 24 * 60 * 60 * 1000;
        const now = new Date().getTime();

        let items = currentUser.role === 'empleado'
            ? reservations.filter(r => {
                // Debe ser su propia reserva
                const isOwner = r.user_id === currentUser.id;

                // Lógica de margen de 5 días para reservas pasadas
                // Si la fecha de fin + 5 días es menor a la actual, se oculta
                const endTime = new Date(r.end_time).getTime();
                const isWithinMargin = (endTime + FIVE_DAYS_IN_MS) > now;

                return isOwner && isWithinMargin;
            })
            : [...reservations];

        // Filtro por rango de fechas
        if (filterStartDate) {
            const start = new Date(filterStartDate).getTime();
            items = items.filter(r => new Date(r.start_time).getTime() >= start);
        }
        if (filterEndDate) {
            const end = new Date(filterEndDate).getTime();
            items = items.filter(r => new Date(r.end_time).getTime() <= end);
        }

        // Aplicar búsqueda global (incluyendo estado)
        if (searchTerm.trim() !== '') {
            const query = searchTerm.toLowerCase().trim();
            items = items.filter(r =>
                r.username?.toLowerCase().includes(query) ||
                r.model?.toLowerCase().includes(query) ||
                r.license_plate?.toLowerCase().includes(query) ||
                r.status?.toLowerCase().includes(query) ||
                r.id.toString().includes(query)
            );
        }

        if (sortConfig !== null) {
            items.sort((a, b) => {
                // Regla especial: 'finalizada' siempre al final
                if (a.status === 'finalizada' && b.status !== 'finalizada') return 1;
                if (a.status !== 'finalizada' && b.status === 'finalizada') return -1;

                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle date strings
                if (sortConfig.key === 'start_time' || sortConfig.key === 'end_time') {
                    aValue = new Date(aValue).getTime();
                    bValue = new Date(bValue).getTime();
                }

                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }

                const aString = String(aValue).toLowerCase();
                const bString = String(bValue).toLowerCase();

                if (aString < bString) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aString > bString) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        } else {
            // Incluso sin configuración de ordenación explícita, mantenemos 'finalizada' al final
            items.sort((a, b) => {
                if (a.status === 'finalizada' && b.status !== 'finalizada') return 1;
                if (a.status !== 'finalizada' && b.status === 'finalizada') return -1;
                return 0;
            });
        }
        return items;
    }, [reservations, currentUser, sortConfig, searchTerm, filterStartDate, filterEndDate]);

    // Datos paginados
    const totalPages = Math.ceil(sortedReservations.length / itemsPerPage);
    const paginatedReservations = isMobile
        ? sortedReservations.slice(0, visibleItems)
        : sortedReservations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
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

    const updateReservationStatus = async (reservation, status) => {
        if (!reservation?.id) return false;

        const payload = {
            user_id: reservation.user_id,
            vehicle_id: reservation.vehicle_id,
            start_time: reservation.start_time,
            end_time: reservation.end_time,
            status,
        };

        const optionalFields = ['km_entrega', 'estado_entrega', 'informe_entrega', 'validacion_entrega'];
        for (const field of optionalFields) {
            if (reservation[field] !== undefined) payload[field] = reservation[field];
        }

        const response = await fetch(`http://localhost:4000/api/dashboard/reservations/${reservation.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
        });

        return response.ok;
    };

    const syncTimeBasedReservationStatuses = async (reservationsList) => {
        const updates = planReservationTimeBasedUpdates(reservationsList, new Date());
        if (updates.length === 0) return reservationsList;

        const next = Array.isArray(reservationsList) ? [...reservationsList] : [];
        let changed = false;
        for (const u of updates) {
            // eslint-disable-next-line no-await-in-loop
            const ok = await updateReservationStatus(u.reservation, u.newStatus);
            if (!ok) continue;

            const idx = next.findIndex(r => String(r.id) === String(u.reservation.id));
            if (idx === -1) continue;

            next[idx] = { ...next[idx], status: u.newStatus };
            changed = true;
        }

        return changed ? next : reservationsList;
    };

    const fetchReservations = async () => {
        try {
            const response = await fetch('http://localhost:4000/api/dashboard/reservations', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                const data = await response.json();
                const list = Array.isArray(data) ? data : [];
                const synced = await syncTimeBasedReservationStatuses(list);
                setReservations(synced);
            } else {
                setReservations([]);
                console.error("Error al cargar reservas, status:", response.status);
            }
        } catch (error) {
            console.error('Error cargando reservas:', error);
            setReservations([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchOptions = async (start = null, end = null, excludeResId = null) => {
        try {
            let vehiclesUrl = 'http://localhost:4000/api/dashboard/vehicles';
            const params = new URLSearchParams();
            if (start) params.append('start', start);
            if (end) params.append('end', end);
            if (excludeResId) params.append('excludeRes', excludeResId);
            if (params.toString()) {
                vehiclesUrl += `?${params.toString()}`;
            }

            const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

            // Si es empleado, no intentamos pedir la lista de todos los usuarios
            if (currentUser.role === 'empleado') {
                const vehiclesRes = await fetch(vehiclesUrl, { headers });
                const vehiclesData = vehiclesRes.ok ? await vehiclesRes.json() : [];
                setUsersList([currentUser]);
                const selectedVehicleId = String(formData.vehicle_id ?? '');
                const filteredVehicles = (Array.isArray(vehiclesData) ? vehiclesData : []).filter(v =>
                    isVehicleReservable(v.status) || (selectedVehicleId && String(v.id) === selectedVehicleId)
                );
                setVehiclesList(filteredVehicles);
            } else {
                const [usersRes, vehiclesRes] = await Promise.all([
                    fetch('http://localhost:4000/api/dashboard/users', { headers }),
                    fetch(vehiclesUrl, { headers })
                ]);
                const usersData = usersRes.ok ? await usersRes.json() : [];
                const vehiclesData = vehiclesRes.ok ? await vehiclesRes.json() : [];

                setUsersList(Array.isArray(usersData) ? usersData : []);
                const selectedVehicleId = String(formData.vehicle_id ?? '');
                const filteredVehicles = (Array.isArray(vehiclesData) ? vehiclesData : []).filter(v =>
                    isVehicleReservable(v.status) || (selectedVehicleId && String(v.id) === selectedVehicleId)
                );
                setVehiclesList(filteredVehicles);
            }
        } catch (error) {
            console.error('Error cargando opciones:', error);
            setVehiclesList([]);
            setUsersList([currentUser]);
        }
    };

    useEffect(() => {
        fetchReservations();
        fetchOptions();

        // Cerrar dropdown al hacer click fuera
        const handleClickOutside = (event) => {
            if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(event.target)) {
                setIsVehicleDropdownOpen(false);
            }
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
                setIsUserDropdownOpen(false);
            }
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
                setIsStatusDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reiniciar paginación al filtrar o buscar
    useEffect(() => {
        setCurrentPage(1);
        setVisibleItems(10);
    }, [searchTerm, filterStartDate, filterEndDate, sortConfig]);

    // Observer para scroll infinito en móvil
    useEffect(() => {
        if (!isMobile) return;
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
    }, [isMobile, reservations]);

    const handleQuickApprove = async (r) => {
        const ok = await updateReservationStatus(r, 'aprobada');
        if (ok) {
            toast.success('Reserva aprobada');
            setReservations(prev => prev.map(item =>
                String(item.id) === String(r.id) ? { ...item, status: 'aprobada' } : item
            ));
        } else {
            toast.error('Error al aprobar reserva');
        }
    };

    const handleQuickReject = async (r) => {
        const ok = await updateReservationStatus(r, 'rechazada');
        if (ok) {
            toast.success('Reserva rechazada');
            setReservations(prev => prev.map(item =>
                String(item.id) === String(r.id) ? { ...item, status: 'rechazada' } : item
            ));
        } else {
            toast.error('Error al rechazar reserva');
        }
    };

    // Actualizar vehículos disponibles cuando cambian las fechas en el formulario
    useEffect(() => {
        if (formData.start_time && formData.end_time) {
            fetchOptions(formData.start_time, formData.end_time, editingId);
        }
    }, [formData.start_time, formData.end_time, editingId]);

    const handleOpenModal = async (reservation = null) => {
        setError('');
        setWizardStep(1);
        if (reservation) {
            // Si el usuario es empleado y la reserva NO está en estado 'pendiente', no permitir editar
            if (currentUser.role === 'empleado' && reservation.status !== 'pendiente') {
                toast.error('Solo puedes editar reservas que estén pendientes');
                return;
            }

            const start = toLocalISOString(new Date(reservation.start_time));
            const end = toLocalISOString(new Date(reservation.end_time));
            setFormData({
                user_id: reservation.user_id,
                vehicle_id: reservation.vehicle_id,
                start_time: start,
                end_time: end,
                status: reservation.status,
                // Guardamos info extra para mostrar mientras carga la lista
                temp_vehicle_info: `${reservation.license_plate} - ${reservation.model}`
            });
            setEditingId(reservation.id);
            // Cargar opciones excluyendo la reserva actual para que el vehículo actual aparezca en la lista
            await fetchOptions(start, end, reservation.id);
        } else {
            const now = toLocalISOString(new Date());
            setFormData({
                ...INITIAL_FORM_STATE,
                user_id: currentUser.role === 'empleado' ? currentUser.id : '',
                start_time: now,
                end_time: now
            });
            setEditingId(null);
            await fetchOptions();
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData(INITIAL_FORM_STATE);
        setEditingId(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setError('');

        const isEditing = !!editingId;

        if (new Date(formData.start_time) >= new Date(formData.end_time)) {
            setError('La fecha de inicio debe ser anterior a la fecha de fin');
            setFormLoading(false);
            return;
        }

        const url = isEditing
            ? `http://localhost:4000/api/dashboard/reservations/${editingId}`
            : 'http://localhost:4000/api/dashboard/reservations';

        try {
            if (isEditing || wizardStep === 2) {
                const originalReservation = isEditing
                    ? reservations.find(r => String(r.id) === String(editingId))
                    : null;

                // Si es edición y el vehículo es el mismo, no es necesario validar que esté en la lista
                const isSameVehicle = isEditing && originalReservation && 
                    String(originalReservation.vehicle_id) === String(formData.vehicle_id);

                if (!isSameVehicle) {
                    const selectedVehicle = vehiclesList.find(v => String(v.id) === String(formData.vehicle_id));
                    if (!selectedVehicle) {
                        throw new Error('Selecciona un vehículo válido.');
                    }

                    const selectedVehicleStatus = normalizeVehicleStatus(selectedVehicle.status);

                    // Regla: solo se puede reservar un nuevo vehículo si está en "disponible"
                    if (selectedVehicleStatus !== 'disponible') {
                        if (currentUser.role === 'empleado' || formData.status !== 'rechazada') {
                            throw new Error('Solo se puede reservar un vehículo que esté en "disponible".');
                        }
                    }
                }

                const isBookingChange = (() => {
                    if (!isEditing) return true;
                    if (!originalReservation) return true;

                    const sameVehicle = String(originalReservation.vehicle_id) === String(formData.vehicle_id);
                    const startEqual = new Date(originalReservation.start_time).getTime() === new Date(formData.start_time).getTime();
                    const endEqual = new Date(originalReservation.end_time).getTime() === new Date(formData.end_time).getTime();
                    return !(sameVehicle && startEqual && endEqual);
                })();
            }

            const response = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al guardar la reserva');
            }

            await fetchReservations();
            handleCloseModal();
            toast.success(isEditing ? '¡Reserva actualizada!' : '¡Reserva creada!');
            if (onOperationComplete) onOperationComplete();
        } catch (err) {
            setError(err.message);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteClick = (id) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        const id = deleteId;
        setDeleteId(null);

        const deletePromise = fetch(`http://localhost:4000/api/dashboard/reservations/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        toast.promise(deletePromise, {
            loading: 'Eliminando...',
            success: () => {
                setReservations(reservations.filter(r => r.id !== id));
                if (onOperationComplete) onOperationComplete();
                return 'Reserva eliminada';
            },
            error: 'Error al eliminar la reserva',
        });
    };

    if (headless) {
        return (
            <>
                {isModalOpen && (
                    renderToBody(
                        <div className={`fixed left-0 right-0 bottom-0 ${shouldKeepHeaderVisible ? 'top-16 z-[55]' : 'top-0 z-[9999]'} flex items-end sm:items-center justify-center bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-xl animate-modal-overlay overscroll-none`}>
                            <div className="bg-white dark:bg-slate-800 shadow-2xl w-full h-[92vh] sm:h-full sm:max-w-4xl sm:rounded-3xl rounded-t-[32px] overflow-hidden flex flex-col transform transition-all animate-modal-slide-up overscroll-contain">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800/50 shrink-0">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                        {editingId ? 'Editar Reserva' : 'Añadir Nueva Reserva'}
                                    </h3>
                                    <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <div className="flex-1 overflow-y-auto overscroll-contain form-scrollbar p-6 space-y-4 pb-32">
                                        {error && (
                                            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800/50">
                                                {error}
                                            </div>
                                        )}

                                        {!editingId && currentUser.role !== 'empleado' && wizardStep === 1 && (
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">Seleccionar Usuario</label>
                                                <div className="relative" ref={userDropdownRef}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                                        className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all flex justify-between items-center shadow-sm hover:shadow-md"
                                                    >
                                                        <span className={!formData.user_id ? 'text-slate-400' : 'font-medium'}>
                                                            {formData.user_id
                                                                ? usersList.find(u => u.id == formData.user_id)?.username
                                                                : 'Seleccionar usuario...'}
                                                        </span>
                                                        <svg className={`w-5 h-5 transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>

                                                    {isUserDropdownOpen && (
                                                        <div className="absolute z-[60] mt-2 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                            <div className="max-h-[250px] overflow-y-auto custom-scrollbar p-1">
                                                                {usersList.length === 0 ? (
                                                                    <div className="px-4 py-3 text-sm text-slate-500 italic text-center">No hay usuarios disponibles</div>
                                                                ) : (
                                                                    usersList.map(u => (
                                                                        <div
                                                                            key={u.id}
                                                                            onClick={() => {
                                                                                setFormData({ ...formData, user_id: u.id });
                                                                                setIsUserDropdownOpen(false);
                                                                            }}
                                                                            className={`px-4 py-3 text-sm cursor-pointer transition-all flex items-center justify-between rounded-xl mb-1
                                                                                ${formData.user_id == u.id
                                                                                    ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20'
                                                                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                                                                        >
                                                                            <span>{u.username} <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded-md uppercase border ${formData.user_id == u.id ? 'border-white/30 text-white/80' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-transparent'}`}></span></span>
                                                                            {formData.user_id == u.id && (
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                                                </svg>
                                                                            )}
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {(editingId || (currentUser.role === 'empleado' && wizardStep === 1) || (currentUser.role !== 'empleado' && wizardStep === 2)) && (
                                            <div className="space-y-4">
                                                {!editingId && <label className="block text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">Definir fechas</label>}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <CustomDateTimePicker
                                                        label="Fecha de Inicio"
                                                        value={formData.start_time}
                                                        onChange={(val) => setFormData({ ...formData, start_time: val })}
                                                        align="left"
                                                    />
                                                    <CustomDateTimePicker
                                                        label="Fecha de Fin"
                                                        value={formData.end_time}
                                                        onChange={(val) => setFormData({ ...formData, end_time: val })}
                                                        error={new Date(formData.end_time) <= new Date(formData.start_time) && formData.end_time}
                                                        align="right"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {(editingId || (currentUser.role === 'empleado' && wizardStep === 2) || (currentUser.role !== 'empleado' && wizardStep === 3)) && (
                                            <div className="space-y-4">
                                                {!editingId && <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">Paso {currentUser.role === 'empleado' ? '2' : '3'}: Seleccionar Vehículo</label>}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {editingId && currentUser.role !== 'empleado' && (
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Usuario</label>
                                                            <div className="relative" ref={userDropdownRef}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                                                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all flex justify-between items-center"
                                                                >
                                                                    <span className={!formData.user_id ? 'text-slate-400' : ''}>
                                                                        {formData.user_id
                                                                            ? usersList.find(u => u.id == formData.user_id)?.username + " (" + usersList.find(u => u.id == formData.user_id)?.role + ")"
                                                                            : 'Seleccionar usuario...'}
                                                                    </span>
                                                                    <svg className={`w-4 h-4 transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                                    </svg>
                                                                </button>

                                                                {isUserDropdownOpen && (
                                                                    <div className="absolute z-[60] mt-2 w-full bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                                        <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                                            {usersList.map(u => (
                                                                                <div key={u.id} onClick={() => { setFormData({ ...formData, user_id: u.id }); setIsUserDropdownOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${formData.user_id == u.id ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600/50'}`}>
                                                                                    <span>{u.username} ({u.role})</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className={(editingId && currentUser.role === 'empleado') || (!editingId) ? 'col-span-2' : ''}>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vehículo</label>
                                                        <div className="relative" ref={vehicleDropdownRef}>
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
                                                                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all flex justify-between items-center shadow-sm hover:shadow-md"
                                                            >
                                                                <span className={!formData.vehicle_id ? 'text-slate-400' : 'font-medium'}>
                                                                    {formData.vehicle_id
                                                                        ? (vehiclesList.find(v => v.id == formData.vehicle_id)
                                                                            ? `${vehiclesList.find(v => v.id == formData.vehicle_id).license_plate} - ${vehiclesList.find(v => v.id == formData.vehicle_id).model}`
                                                                            : formData.temp_vehicle_info || 'Cargando vehículo...')
                                                                        : 'Seleccionar vehículo...'}
                                                                </span>
                                                                <svg className={`w-5 h-5 transition-transform duration-200 ${isVehicleDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            </button>

                                                            {isVehicleDropdownOpen && (
                                                                <div className="absolute z-[60] mt-2 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                                                                        {vehiclesList.length === 0 ? (
                                                                            <div className="px-4 py-3 text-sm text-slate-500 italic text-center">No hay vehículos disponibles</div>
                                                                        ) : (
                                                                            vehiclesList.map(v => (
                                                                                <div
                                                                                    key={v.id}
                                                                                    onClick={() => {
                                                                                        setFormData({ ...formData, vehicle_id: v.id });
                                                                                        setIsVehicleDropdownOpen(false);
                                                                                    }}
                                                                                    className={`px-4 py-3 text-sm cursor-pointer transition-all flex items-center justify-between rounded-xl mb-1
                                                                                ${formData.vehicle_id == v.id
                                                                                            ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20'
                                                                                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                                                                                >
                                                                                    <span>{v.license_plate} - {v.model}</span>
                                                                                </div>
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {(editingId || currentUser.role !== 'empleado') && (
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                                                        <div className="relative" ref={statusDropdownRef}>
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                                                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all flex justify-between items-center shadow-sm hover:shadow-md capitalize"
                                                            >
                                                                <span className={!formData.status ? 'text-slate-400' : 'font-medium'}>
                                                                    {formData.status || 'Seleccionar estado...'}
                                                                </span>
                                                                <svg className={`w-5 h-5 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            </button>

                                                            {isStatusDropdownOpen && (
                                                                <div className="absolute z-[60] mt-2 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                                                                        {RESERVATION_STATUS_OPTIONS.map(s => (
                                                                            <div
                                                                                key={s}
                                                                                onClick={() => {
                                                                                    setFormData({ ...formData, status: s });
                                                                                    setIsStatusDropdownOpen(false);
                                                                                }}
                                                                                className={`px-4 py-3 text-sm cursor-pointer transition-all flex items-center justify-between rounded-xl mb-1 capitalize
                                                                                ${formData.status === s
                                                                                        ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20'
                                                                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                                                                            >
                                                                                <span>{s}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 flex gap-3">
                                        {(!editingId && ((currentUser.role === 'empleado' && wizardStep === 2) || (currentUser.role !== 'empleado' && wizardStep === 3))) ? (
                                            <button
                                                type="button"
                                                onClick={() => setWizardStep(prev => prev - 1)}
                                                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                                            >
                                                Atrás
                                            </button>
                                        ) : !editingId && wizardStep > 1 ? (
                                            <button
                                                type="button"
                                                onClick={() => setWizardStep(prev => prev - 1)}
                                                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                                            >
                                                Atrás
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleCloseModal}
                                                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                                            >
                                                Cancelar
                                            </button>
                                        )}

                                        {(!editingId && ((currentUser.role === 'empleado' && wizardStep < 2) || (currentUser.role !== 'empleado' && wizardStep < 3))) ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setError('');
                                                    if (currentUser.role !== 'empleado' && wizardStep === 1) {
                                                        if (!formData.user_id) {
                                                            setError('Selecciona un usuario para continuar');
                                                            return;
                                                        }
                                                        setWizardStep(2);
                                                    } else if ((currentUser.role === 'empleado' && wizardStep === 1) || (currentUser.role !== 'empleado' && wizardStep === 2)) {
                                                        const start = new Date(formData.start_time);
                                                        const end = new Date(formData.end_time);

                                                        if (end <= start) {
                                                            setError('La fecha de fin debe ser posterior a la de inicio');
                                                            return;
                                                        }

                                                        // Validación de solapamiento para el usuario seleccionado
                                                        const userReservations = reservations.filter(r =>
                                                            String(r.user_id) === String(formData.user_id) &&
                                                            r.status !== 'rechazada' && r.status !== 'finalizada' &&
                                                            (!editingId || String(r.id) !== String(editingId))
                                                        );

                                                        const hasOverlap = userReservations.some(r => {
                                                            const rStart = new Date(r.start_time);
                                                            const rEnd = new Date(r.end_time);
                                                            return (start < rEnd && end > rStart);
                                                        });

                                                        if (hasOverlap) {
                                                            setError('Este usuario ya tiene una reserva activa en este horario');
                                                            return;
                                                        }
                                                        setWizardStep(prev => prev + 1);
                                                    }
                                                }}
                                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium shadow-sm shadow-blue-500/30 flex justify-center items-center"
                                            >
                                                Siguiente
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleSave}
                                                disabled={formLoading}
                                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium shadow-sm shadow-blue-500/30 disabled:opacity-70 flex justify-center items-center"
                                            >
                                                {formLoading ? (
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                ) : (
                                                    editingId ? 'Guardar Cambios' : 'Confirmar Reserva'
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                )}

                {deleteId && (
                    renderToBody(
                        <div className={`fixed left-0 right-0 bottom-0 ${shouldKeepHeaderVisible ? 'top-16 z-[55]' : 'top-0 z-[9999]'} flex items-center justify-center p-4 overscroll-none`}>
                            <div
                                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
                                onClick={() => setDeleteId(null)}
                            />
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full relative z-10 shadow-2xl animate-scale-in border border-slate-200 dark:border-slate-700">
                                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-center text-slate-800 dark:text-white mb-2">¿Estás seguro?</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
                                    Esta acción eliminará la reserva permanentemente y no se puede deshacer.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setDeleteId(null)}
                                        className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                                    >
                                        Sí, eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                )}
            </>
        );
    }

    return (
        <div className={`relative ${allowPageFlow ? 'h-auto' : 'h-full'} flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6 animate-fade-in transition-colors ${allowPageFlow ? 'overflow-visible' : 'overflow-hidden'}`}>
            {isMobile ? (
                // --- CABECERA MÓVIL ---
                <div className="flex flex-col gap-4 mb-6">
                    {/* Fila 1: Título, Contador y Botón Agregar */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white shrink-0">Reservas</h2>
                            <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg w-fit">
                                {sortedReservations.length} total
                            </span>
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl font-bold text-xs flex items-center transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                        >
                            <span className="text-lg mr-1.5 leading-none">+</span>
                            <span>Nueva</span>
                        </button>
                    </div>

                    {/* Fila 2: Buscador */}
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar usuario, vehículo, matrícula o estado ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-200"
                        />
                    </div>

                    {/* Fila 3: Filtros de Fecha */}
                    <div className="grid grid-cols-2 gap-3">
                        <CustomDateTimePicker
                            label="Desde"
                            value={filterStartDate}
                            onChange={(val) => setFilterStartDate(val)}
                            align="left"
                        />
                        <CustomDateTimePicker
                            label="Hasta"
                            value={filterEndDate}
                            onChange={(val) => setFilterEndDate(val)}
                            align="right"
                        />
                    </div>

                    {/* Fila 4: Limpiar Filtros */}
                    {(filterStartDate || filterEndDate) && (
                        <button
                            onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                            className="w-full py-2.5 text-[10px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl transition-colors flex items-center justify-center gap-2"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                            LIMPIAR FILTROS
                        </button>
                    )}
                </div>
            ) : (
                // --- CABECERA DESKTOP ---
                <div className="flex items-bottom justify-between gap-6 mb-6 shrink-0 w-full">
                    <div className="mt-7 gap-3 min-w-0">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white shrink-0">Reservas</h2>
                    </div>
                    <div className="flex flex-1 items-end gap-4 min-w-0">

                        <div className="relative flex-1 max-w-xl">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar usuario, vehículo, matrícula o estado ..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    <div className="flex items-end gap-3 flex-1 max-w-2xl justify-end">
                        <div className="flex-1">
                            <CustomDateTimePicker label="Desde" value={filterStartDate} onChange={setFilterStartDate} align="left" />
                        </div>
                        <div className="flex-1">
                            <CustomDateTimePicker label="Hasta" value={filterEndDate} onChange={setFilterEndDate} align="right" />
                        </div>
                        {(filterStartDate || filterEndDate) && (
                            <button
                                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                                className="mb-1 p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                                title="Limpiar filtros"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        )}
                    </div>
                        <div className="flex items-end mb-2 gap-2">
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-medium text-sm flex items-center transition-colors shadow-sm shadow-blue-500/20"
                            title="Añadir vehículo">
                            <span className="text-lg mr-1 leading-none">+</span>
                            <span>Añadir Reserva</span>
                        </button>
                        <span className="text-sm font-medium px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg whitespace-nowrap">
                            {reservations.length} total
                        </span>
                    </div>
                    
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                    <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin mb-4"></div>
                    <p className="italic">Cargando reservas...</p>
                </div>
            ) : reservations.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No hay reservas registradas</p>
                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Las reservas aparecerán aquí una vez creadas.</p>
                </div>
            ) : isMobile ? (
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {paginatedReservations.map((r) => (
                        <div
                            key={r.id}
                            className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 shadow-sm hover:border-blue-300 dark:hover:border-blue-800 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{r.model}</h3>
                                    {(currentUser.role === 'admin' || currentUser.role === 'supervisor') && (
                                        <p className="text-blue-600 dark:text-blue-400 font-medium text-xs mt-1">Usuario: {r.username}</p>
                                    )}
                                </div>
                                <span className={`chip-uniform px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700'}`}>
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
                            </div>

                            <div className="flex items-center justify-end pt-4 border-t border-slate-50 dark:border-slate-700/50 gap-2">
                                {(currentUser.role === 'admin' || currentUser.role === 'supervisor') && r.status === 'pendiente' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleQuickApprove(r)}
                                            className="p-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 transition-colors"
                                            title="Aprobar rápidamente"
                                        >
                                            <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleQuickReject(r)}
                                            className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-colors"
                                            title="Rechazar rápidamente"
                                        >
                                            <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                {(currentUser.role === 'admin' || currentUser.role === 'supervisor' || r.user_id === currentUser.id) ? (
                                    <>
                                        <button
                                            onClick={() => handleOpenModal(r)}
                                            className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-100 transition-colors text-xs font-bold flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(r.id)}
                                            className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </>
                                ) : (
                                    <span className="text-[10px] text-slate-400 font-bold uppercase italic px-3 py-1 bg-slate-50 dark:bg-slate-900/30 rounded-lg">Solo lectura</span>
                                )}
                            </div>
                        </div>
                    ))}
                    {visibleItems < sortedReservations.length && (
                        <div ref={scrollObserverRef} className="h-10 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
            ) : (
                <div className={`${allowPageFlow ? 'h-auto overflow-hidden' : 'flex-1 overflow-hidden'} flex flex-col`}>
                    <div className={`${allowPageFlow ? 'overflow-auto' : 'flex-1 overflow-auto'} form-scrollbar`}>
                        <table className="w-full text-sm text-left relative">
                            <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">
                                    <th onClick={() => requestSort('username')} className="pb-3 px-4 text-center cursor-pointer hover:text-blue-600 transition-colors group">
                                        <div className="flex items-center justify-center">
                                            Usuario {getSortIcon('username')}
                                        </div>
                                    </th>
                                    <th onClick={() => requestSort('model')} className="pb-3 px-4 text-center cursor-pointer hover:text-blue-600 transition-colors group">
                                        <div className="flex items-center justify-center">
                                            Vehículo {getSortIcon('model')}
                                        </div>
                                    </th>
                                    <th onClick={() => requestSort('start_time')} className="pb-3 px-4 text-center cursor-pointer hover:text-blue-600 transition-colors group">
                                        <div className="flex items-center justify-center">
                                            Fecha Inicio {getSortIcon('start_time')}
                                        </div>
                                    </th>
                                    <th onClick={() => requestSort('end_time')} className="pb-3 px-4 text-center cursor-pointer hover:text-blue-600 transition-colors group">
                                        <div className="flex items-center justify-center">
                                            Fecha Fin {getSortIcon('end_time')}
                                        </div>
                                    </th>
                                    <th onClick={() => requestSort('status')} className="pb-3 px-4 text-center cursor-pointer hover:text-blue-600 transition-colors group">
                                        <div className="flex items-center justify-center">
                                            Estado {getSortIcon('status')}
                                        </div>
                                    </th>
                                    <th className="pb-3 px-4 text-center">Opciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedReservations.map((r) => (
                                    <tr key={r.id} className="border-b border-slate-200/70 dark:border-slate-700/60 odd:bg-slate-50 even:bg-white dark:odd:bg-slate-800/40 dark:even:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-200">{r.username}</td>
                                        <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{r.model}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`chip-uniform px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES.fecha ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                {formatDate(r.start_time)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`chip-uniform px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES.fecha ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                {formatDate(r.end_time)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`chip-uniform px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                {r.status}
                                            </span>
                                        </td>

                                        {/* Botones de opciones (editar y eliminar) */}
                                        <td className="py-3 px-4 text-center ">
                                            {(currentUser.role === 'admin' || currentUser.role === 'supervisor') && r.status === 'pendiente' && (
                                                <>
                                                    <button
                                                        onClick={() => handleQuickApprove(r)}
                                                        className="p-2 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors mr-1"
                                                        title="Aprobar rápidamente"
                                                    >
                                                        <FontAwesomeIcon icon={faCheck} className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleQuickReject(r)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mr-1"
                                                        title="Rechazar rápidamente"
                                                    >
                                                        <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                            {(currentUser.role === 'admin' || currentUser.role === 'supervisor' || r.user_id === currentUser.id) ? (
                                                <>
                                                    <button
                                                        onClick={() => handleOpenModal(r)}
                                                        className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors mr-1"
                                                        title="Editar reserva"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteClick(r.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Eliminar reserva"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Solo lectura</span>
                                            )}
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINACIÓN ESCRITORIO */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                Página <span className="font-bold text-slate-700 dark:text-slate-200">{currentPage}</span> de {totalPages}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
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
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === page
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
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
                                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                </button>

                                <div className="ml-4 flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                                    <span className="text-xs text-slate-400">Ir a:</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={currentPage}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val) && val >= 1 && val <= totalPages) setCurrentPage(val);
                                        }}
                                        className="w-12 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL CREADO/EDICIÓN */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-xl animate-modal-overlay">
                    <div className="bg-white dark:bg-slate-800 shadow-2xl w-full h-[92vh] sm:h-full sm:max-w-4xl sm:rounded-3xl rounded-t-[32px] overflow-hidden flex flex-col transform transition-all animate-modal-slide-up">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800/50 shrink-0">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                {editingId ? 'Editar Reserva' : 'Añadir Nueva Reserva'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto overscroll-contain form-scrollbar p-6 space-y-4 pb-32">
                                {error && (
                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800/50">
                                        {error}
                                    </div>
                                )}

                                {/* PASO 1 (Admin/Supervisor): SELECCIÓN DE USUARIO */}
                                {!editingId && currentUser.role !== 'empleado' && wizardStep === 1 && (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                        <label className="block text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">Reserva de:</label>
                                        <div className="relative" ref={userDropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all flex justify-between items-center shadow-sm hover:shadow-md"
                                            >
                                                <span className={!formData.user_id ? 'text-slate-400' : 'font-medium'}>
                                                    {formData.user_id
                                                        ? usersList.find(u => u.id == formData.user_id)?.username
                                                        : 'Seleccionar usuario...'}
                                                </span>
                                                <svg className={`w-5 h-5 transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {isUserDropdownOpen && (
                                                <div className="absolute z-[60] mt-2 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar p-1">
                                                        {usersList.length === 0 ? (
                                                            <div className="px-4 py-3 text-sm text-slate-500 italic text-center">No hay usuarios disponibles</div>
                                                        ) : (
                                                            usersList.map(u => (
                                                                <div
                                                                    key={u.id}
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, user_id: u.id });
                                                                        setIsUserDropdownOpen(false);
                                                                    }}
                                                                    className={`px-4 py-3 text-sm cursor-pointer transition-all flex items-center justify-between rounded-xl mb-1
                                                                        ${formData.user_id == u.id
                                                                            ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20'
                                                                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                                                                >
                                                                    <span>{u.username}</span>
                                                                    {formData.user_id == u.id && (
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* PASO 2 (Admin/Sup) o PASO 1 (Emp): FECHAS */}
                                {(editingId || (currentUser.role === 'empleado' && wizardStep === 1) || (currentUser.role !== 'empleado' && wizardStep === 2)) && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                        {!editingId && <label className="block text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">Definir Fechas</label>}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <CustomDateTimePicker
                                                label="Fecha de Inicio"
                                                value={formData.start_time}
                                                onChange={(val) => setFormData({ ...formData, start_time: val })}
                                                align="left"
                                            />
                                            <CustomDateTimePicker
                                                label="Fecha de Fin"
                                                value={formData.end_time}
                                                onChange={(val) => setFormData({ ...formData, end_time: val })}
                                                error={new Date(formData.end_time) <= new Date(formData.start_time) && formData.end_time}
                                                align="right"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* PASO 3 (Admin/Sup) o PASO 2 (Emp): VEHÍCULO Y ESTADO */}
                                {(editingId || (currentUser.role === 'empleado' && wizardStep === 2) || (currentUser.role !== 'empleado' && wizardStep === 3)) && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                        {!editingId && <label className="block text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">Seleccionar vehículo</label>}
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Si estamos editando y somos admin, podemos cambiar el usuario aquí mismo */}
                                            {editingId && currentUser.role !== 'empleado' && (
                                                <div className="col-span-2 sm:col-span-1">
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Usuario</label>
                                                    <div className="relative" ref={userDropdownRef}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                                            className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all flex justify-between items-center shadow-sm hover:shadow-md"
                                                        >
                                                            <span className={!formData.user_id ? 'text-slate-400' : 'font-medium'}>
                                                                {formData.user_id
                                                                    ? usersList.find(u => u.id == formData.user_id)?.username
                                                                    : 'Seleccionar usuario...'}
                                                            </span>
                                                            <svg className={`w-5 h-5 transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </button>
                                                        {isUserDropdownOpen && (
                                                            <div className="absolute z-[60] mt-2 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                                <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                                                                    {usersList.map(u => (
                                                                        <div key={u.id} onClick={() => { setFormData({ ...formData, user_id: u.id }); setIsUserDropdownOpen(false); }} className={`px-4 py-3 text-sm cursor-pointer transition-all flex items-center justify-between rounded-xl mb-1 ${formData.user_id == u.id ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}>
                                                                            <span>{u.username}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className={(editingId && currentUser.role !== 'empleado') ? 'col-span-2 sm:col-span-1' : 'col-span-2'}>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vehículo</label>
                                                <div className="relative" ref={vehicleDropdownRef}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
                                                        className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all flex justify-between items-center shadow-sm hover:shadow-md"
                                                    >
                                                        <span className={!formData.vehicle_id ? 'text-slate-400' : 'font-medium'}>
                                                            {formData.vehicle_id
                                                                ? (vehiclesList.find(v => v.id == formData.vehicle_id)
                                                                    ? `${vehiclesList.find(v => v.id == formData.vehicle_id).license_plate} - ${vehiclesList.find(v => v.id == formData.vehicle_id).model}`
                                                                    : formData.temp_vehicle_info || 'Cargando vehículo...')
                                                                : 'Seleccionar vehículo...'}
                                                        </span>
                                                        <svg className={`w-5 h-5 transition-transform duration-200 ${isVehicleDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>

                                                    {isVehicleDropdownOpen && (
                                                        <div className="absolute z-[60] mt-2 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                                                                {vehiclesList.length === 0 ? (
                                                                    <div className="px-4 py-3 text-sm text-slate-500 italic text-center">No hay vehículos disponibles</div>
                                                                ) : (
                                                                    vehiclesList.map(v => (
                                                                        <div
                                                                            key={v.id}
                                                                            onClick={() => {
                                                                                setFormData({ ...formData, vehicle_id: v.id });
                                                                                setIsVehicleDropdownOpen(false);
                                                                            }}
                                                                            className={`px-4 py-3 text-sm cursor-pointer transition-all flex items-center justify-between rounded-xl mb-1
                                                                        ${formData.vehicle_id == v.id
                                                                                        ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20'
                                                                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                                                                        >
                                                                            <span>{v.license_plate} - {v.model}</span>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {(editingId || currentUser.role !== 'empleado') && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                                                <div className="relative" ref={statusDropdownRef}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                                        className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all flex justify-between items-center shadow-sm hover:shadow-md capitalize"
                                                    >
                                                        <span className={!formData.status ? 'text-slate-400' : 'font-medium'}>
                                                            {formData.status || 'Seleccionar estado...'}
                                                        </span>
                                                        <svg className={`w-5 h-5 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>

                                                    {isStatusDropdownOpen && (
                                                        <div className="absolute z-[60] mt-2 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                                                                {RESERVATION_STATUS_OPTIONS.map(s => (
                                                                    <div
                                                                        key={s}
                                                                        onClick={() => {
                                                                            setFormData({ ...formData, status: s });
                                                                            setIsStatusDropdownOpen(false);
                                                                        }}
                                                                        className={`px-4 py-3 text-sm cursor-pointer transition-all flex items-center justify-between rounded-xl mb-1 capitalize
                                                                        ${formData.status === s
                                                                                        ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20'
                                                                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                                                                    >
                                                                        <span>{s}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 flex gap-3">
                                {(!editingId && wizardStep > 1) ? (
                                    <button
                                        type="button"
                                        onClick={() => setWizardStep(prev => prev - 1)}
                                        className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                                    >
                                        Atrás
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                                    >
                                        Cancelar
                                    </button>
                                )}

                                {(!editingId && ((currentUser.role === 'empleado' && wizardStep < 2) || (currentUser.role !== 'empleado' && wizardStep < 3))) ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setError('');
                                            if (currentUser.role !== 'empleado' && wizardStep === 1) {
                                                if (!formData.user_id) {
                                                    setError('Selecciona un usuario para continuar');
                                                    return;
                                                }
                                                setWizardStep(2);
                                            } else if ((currentUser.role === 'empleado' && wizardStep === 1) || (currentUser.role !== 'empleado' && wizardStep === 2)) {
                                                const start = new Date(formData.start_time);
                                                const end = new Date(formData.end_time);
                                                if (end <= start) {
                                                    setError('La fecha de fin debe ser posterior a la de inicio');
                                                    return;
                                                }
                                                // Validación de solapamiento para el usuario seleccionado
                                                const userReservations = reservations.filter(r => 
                                                    String(r.user_id) === String(formData.user_id) && 
                                                    r.status !== 'rechazada' && r.status !== 'finalizada' &&
                                                    (!editingId || String(r.id) !== String(editingId))
                                                );
                                                const hasOverlap = userReservations.some(r => {
                                                    const rStart = new Date(r.start_time);
                                                    const rEnd = new Date(r.end_time);
                                                    return (start < rEnd && end > rStart);
                                                });
                                                if (hasOverlap) {
                                                    setError('Este usuario ya tiene una reserva activa en este horario');
                                                    return;
                                                }
                                                setWizardStep(prev => prev + 1);
                                            }
                                        }}
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium shadow-sm shadow-blue-500/30 flex justify-center items-center"
                                    >
                                        Siguiente
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={formLoading}
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium shadow-sm shadow-blue-500/30 disabled:opacity-70 flex justify-center items-center"
                                    >
                                        {formLoading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            editingId ? 'Guardar Cambios' : 'Confirmar Reserva'
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {deleteId && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 min-h-screen">
                    <div
                        className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-xl animate-modal-overlay"
                        onClick={() => setDeleteId(null)}
                    />
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full relative z-10 shadow-2xl animate-scale-in border border-slate-200 dark:border-slate-700">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-center text-slate-800 dark:text-white mb-2">¿Estás seguro?</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
                            Esta acción eliminará la reserva permanentemente y no se puede deshacer.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                            >
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
