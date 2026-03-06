import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import useIsMobile from '../hooks/useIsMobile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faClock, faChevronLeft, faChevronRight, faCheck } from '@fortawesome/free-solid-svg-icons';

const INITIAL_FORM_STATE = { user_id: '', vehicle_id: '', start_time: '', end_time: '', status: 'pendiente' };

const STATUS_STYLES = {
    'aprobada': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'rechazada': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'pendiente': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'fecha': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
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

    // Parse the current value or use "now"
    const selectedDate = value ? new Date(value) : new Date();

    // View state (which month/year we are looking at)
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
        const startDay = (firstDayOfMonth(year, month) + 6) % 7; // Adjust to start Monday

        for (let i = 0; i < startDay; i++) days.push(null);
        for (let i = 1; i <= totalDays; i++) days.push(i);
        return days;
    }, [viewDate]);

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 ml-1">{label}</label>
            <div className={`relative group w-full flex items-center rounded-2xl border transition-all shadow-sm
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
                    placeholder="DD/MM/AAAA HH:MM"
                    className="w-full px-3 py-3 bg-transparent text-slate-900 dark:text-white outline-none font-medium placeholder:text-slate-300 dark:placeholder:text-slate-600"
                />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="pr-5 text-slate-400 hover:text-blue-500 transition-colors"
                >
                    <FontAwesomeIcon icon={faClock} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

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

export default function ReservationsView({
    shouldOpenAddModal,
    onAddModalOpened,
    reservationToEdit,
    onEditModalOpened,
    reservationToDeleteId,
    onDeleteActionHandled,
    headless = false,
    onOperationComplete
}) {
    const isMobile = useIsMobile();
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal/Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    const sortedReservations = useMemo(() => {
        let items = currentUser.role === 'empleado'
            ? reservations.filter(r => r.user_id === currentUser.id)
            : [...reservations];

        // Aplicar búsqueda global
        if (searchTerm.trim() !== '') {
            const query = searchTerm.toLowerCase().trim();
            items = items.filter(r =>
                r.username?.toLowerCase().includes(query) ||
                r.model?.toLowerCase().includes(query) ||
                r.license_plate?.toLowerCase().includes(query) ||
                r.id.toString().includes(query)
            );
        }

        if (sortConfig !== null) {
            items.sort((a, b) => {
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
        }
        return items;
    }, [reservations, currentUser, sortConfig]);

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

    const fetchReservations = async () => {
        try {
            const response = await fetch('http://localhost:4000/api/dashboard/reservations', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            setReservations(data);
        } catch (error) {
            console.error('Error cargando reservas:', error);
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
                const vehiclesData = await vehiclesRes.json();
                setUsersList([currentUser]);
                setVehiclesList(vehiclesData);
            } else {
                const [usersRes, vehiclesRes] = await Promise.all([
                    fetch('http://localhost:4000/api/dashboard/users', { headers }),
                    fetch(vehiclesUrl, { headers })
                ]);
                const usersData = await usersRes.json();
                const vehiclesData = await vehiclesRes.json();
                setUsersList(usersData);
                setVehiclesList(vehiclesData);
            }
        } catch (error) {
            console.error('Error cargando opciones:', error);
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

    // Actualizar vehículos disponibles cuando cambian las fechas en el formulario
    useEffect(() => {
        if (formData.start_time && formData.end_time) {
            fetchOptions(formData.start_time, formData.end_time, editingId);
        }
    }, [formData.start_time, formData.end_time, editingId]);

    const handleOpenModal = (reservation = null) => {
        setError('');
        if (reservation) {
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
        } else {
            const now = toLocalISOString(new Date());
            setFormData({
                ...INITIAL_FORM_STATE,
                user_id: currentUser.role === 'empleado' ? currentUser.id : '',
                start_time: now,
                end_time: now
            });
            setEditingId(null);
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

                                <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
                                    <div className="flex-1 overflow-y-auto overscroll-contain form-scrollbar p-6 space-y-4 pb-32">
                                        {error && (
                                            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800/50">
                                                {error}
                                            </div>
                                        )}

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

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {currentUser.role !== 'empleado' && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Usuario</label>
                                                <div className="relative" ref={userDropdownRef}>
                                                    <button
                                                        type="button"
                                                        disabled={currentUser.role === 'empleado'}
                                                        onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                                        className={`w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all flex justify-between items-center ${currentUser.role === 'empleado' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                    >
                                                        <span className={!formData.user_id ? 'text-slate-400' : ''}>
                                                            {formData.user_id
                                                                ? usersList.find(u => u.id == formData.user_id)?.username + " (" + usersList.find(u => u.id == formData.user_id)?.role + ")"
                                                                : 'Seleccionar usuario...'}
                                                        </span>
                                                        {currentUser.role !== 'empleado' && (
                                                            <svg className={`w-4 h-4 transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        )}
                                                    </button>

                                                    {isUserDropdownOpen && currentUser.role !== 'empleado' && (
                                                        <div className="absolute z-[60] mt-2 w-full bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                                {usersList.length === 0 ? (
                                                                    <div className="px-4 py-3 text-sm text-slate-500 italic">No hay usuarios disponibles</div>
                                                                ) : (
                                                                    usersList.map(u => (
                                                                        <div
                                                                            key={u.id}
                                                                            onClick={() => {
                                                                                setFormData({ ...formData, user_id: u.id });
                                                                                setIsUserDropdownOpen(false);
                                                                            }}
                                                                            className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between
                                                                                ${formData.user_id == u.id
                                                                                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium'
                                                                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600/50'}`}
                                                                        >
                                                                            <span>{u.username} ({u.role})</span>
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
                                                <input type="hidden" required value={formData.user_id} />
                                            </div>
                                        )}
                                        <div className={currentUser.role === 'empleado' ? 'col-span-2' : ''}>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vehículo</label>
                                            <div className="relative" ref={vehicleDropdownRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
                                                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all flex justify-between items-center"
                                                >
                                                    <span className={!formData.vehicle_id ? 'text-slate-400' : ''}>
                                                        {formData.vehicle_id
                                                            ? (vehiclesList.find(v => v.id == formData.vehicle_id)
                                                                ? `${vehiclesList.find(v => v.id == formData.vehicle_id).license_plate} - ${vehiclesList.find(v => v.id == formData.vehicle_id).model}`
                                                                : formData.temp_vehicle_info || 'Cargando vehículo...')
                                                            : 'Seleccionar vehículo...'}
                                                    </span>
                                                    <svg className={`w-4 h-4 transition-transform duration-200 ${isVehicleDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>

                                                {isVehicleDropdownOpen && (
                                                    <div className="absolute z-[60] mt-2 w-full bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                        <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                            {vehiclesList.length === 0 ? (
                                                                <div className="px-4 py-3 text-sm text-slate-500 italic">No hay vehículos disponibles</div>
                                                            ) : (
                                                                vehiclesList.map(v => (
                                                                    <div
                                                                        key={v.id}
                                                                        onClick={() => {
                                                                            setFormData({ ...formData, vehicle_id: v.id });
                                                                            setIsVehicleDropdownOpen(false);
                                                                        }}
                                                                        className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between
                                                                            ${formData.vehicle_id == v.id
                                                                                ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium'
                                                                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600/50'}`}
                                                                    >
                                                                        <span>{v.license_plate} - {v.model}</span>
                                                                        {formData.vehicle_id == v.id && (
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
                                            <input type="hidden" required value={formData.vehicle_id} />
                                        </div>
                                    </div>

                                    {currentUser.role !== 'empleado' && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                                            <div className="relative" ref={statusDropdownRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all flex justify-between items-center capitalize"
                                                >
                                                    <span className={!formData.status ? 'text-slate-400' : ''}>
                                                        {formData.status || 'Seleccionar estado...'}
                                                    </span>
                                                    <svg className={`w-4 h-4 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>

                                                {isStatusDropdownOpen && (
                                                    <div className="absolute z-[60] mt-2 w-full bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                        <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                            {['pendiente', 'aprobada', 'rechazada'].map(s => (
                                                                <div
                                                                    key={s}
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, status: s });
                                                                        setIsStatusDropdownOpen(false);
                                                                    }}
                                                                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between capitalize
                                                                        ${formData.status === s
                                                                            ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium'
                                                                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600/50'}`}
                                                                >
                                                                    <span>{s}</span>
                                                                    {formData.status === s && (
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <input type="hidden" required value={formData.status} />
                                        </div>
                                    )}
                                    </div>

                                    <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={formLoading}
                                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium shadow-sm shadow-blue-500/30 disabled:opacity-70 flex justify-center items-center"
                                        >
                                            {formLoading ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                editingId ? 'Guardar Cambios' : 'Crear Reserva'
                                            )}
                                        </button>
                                    </div>
                                </form>
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
        <div className="relative h-full flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6 animate-fade-in transition-colors overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white shrink-0">Reservas</h2>
                    <div className="relative flex-1 max-w-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por usuario, vehículo o matrícula..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-200"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleOpenModal()}
                        className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium text-sm flex items-center"
                        title="Añadir reserva" >
                        <span className="text-xl mr-1">+</span> Agregar reserva
                    </button>
                    <span className="text-sm font-medium px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg">
                        {sortedReservations.length} reservas
                    </span>
                </div>
            </div>

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
                    {sortedReservations.map((r) => (
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
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700'}`}>
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
                </div>
            ) : (
                <div className="flex-1 overflow-x-auto form-scrollbar">
                    <table className="w-full text-sm text-left relative">
                        <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">
                                <th onClick={() => requestSort('username')} className="pb-3 px-4 text-center cursor-pointer hover:text-blue-600 transition-colors group">
                                    <div className="flex items-center justify-center">
                                        Cliente {getSortIcon('username')}
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
                            {sortedReservations.map((r) => (
                                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all duration-200">
                                    <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-200">{r.username}</td>
                                    <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{r.model}</td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[r.status.fecha] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                            {formatDate(r.start_time)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[r.status.fecha] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                            {formatDate(r.end_time)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                            {r.status}
                                        </span>
                                    </td>

                                    {/* Botones de opciones (editar y eliminar) */}
                                    <td className="py-3 px-4 text-center ">
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

                        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto form-scrollbar p-6 space-y-4 pb-32">
                                {error && (
                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800/50">
                                        {error}
                                    </div>
                                )}

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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {currentUser.role !== 'empleado' && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Usuario</label>
                                            <div className="relative" ref={userDropdownRef}>
                                                <button
                                                    type="button"
                                                    disabled={currentUser.role === 'empleado'}
                                                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                                    className={`w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all flex justify-between items-center ${currentUser.role === 'empleado' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                >
                                                    <span className={!formData.user_id ? 'text-slate-400' : ''}>
                                                        {formData.user_id
                                                            ? usersList.find(u => u.id == formData.user_id)?.username + " (" + usersList.find(u => u.id == formData.user_id)?.role + ")"
                                                            : 'Seleccionar usuario...'}
                                                    </span>
                                                    {currentUser.role !== 'empleado' && (
                                                        <svg className={`w-4 h-4 transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    )}
                                                </button>

                                                {isUserDropdownOpen && currentUser.role !== 'empleado' && (
                                                    <div className="absolute z-[60] mt-2 w-full bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                        <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                            {usersList.length === 0 ? (
                                                                <div className="px-4 py-3 text-sm text-slate-500 italic">No hay usuarios disponibles</div>
                                                            ) : (
                                                                usersList.map(u => (
                                                                    <div
                                                                        key={u.id}
                                                                        onClick={() => {
                                                                            setFormData({ ...formData, user_id: u.id });
                                                                            setIsUserDropdownOpen(false);
                                                                        }}
                                                                        className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between
                                                                            ${formData.user_id == u.id
                                                                                ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium'
                                                                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600/50'}`}
                                                                    >
                                                                        <span>{u.username} ({u.role})</span>
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
                                            <input type="hidden" required value={formData.user_id} />
                                        </div>
                                    )}
                                    <div className={currentUser.role === 'empleado' ? 'col-span-2' : ''}>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vehículo</label>
                                        <div className="relative" ref={vehicleDropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
                                                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all flex justify-between items-center"
                                            >
                                                <span className={!formData.vehicle_id ? 'text-slate-400' : ''}>
                                                    {formData.vehicle_id
                                                        ? (vehiclesList.find(v => v.id == formData.vehicle_id)
                                                            ? `${vehiclesList.find(v => v.id == formData.vehicle_id).license_plate} - ${vehiclesList.find(v => v.id == formData.vehicle_id).model}`
                                                            : formData.temp_vehicle_info || 'Cargando vehículo...')
                                                        : 'Seleccionar vehículo...'}
                                                </span>
                                                <svg className={`w-4 h-4 transition-transform duration-200 ${isVehicleDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {isVehicleDropdownOpen && (
                                                <div className="absolute z-[60] mt-2 w-full bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                        {vehiclesList.length === 0 ? (
                                                            <div className="px-4 py-3 text-sm text-slate-500 italic">No hay vehículos disponibles</div>
                                                        ) : (
                                                            vehiclesList.map(v => (
                                                                <div
                                                                    key={v.id}
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, vehicle_id: v.id });
                                                                        setIsVehicleDropdownOpen(false);
                                                                    }}
                                                                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between
                                                                        ${formData.vehicle_id == v.id
                                                                            ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium'
                                                                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600/50'}`}
                                                                >
                                                                    <span>{v.license_plate} - {v.model}</span>
                                                                    {formData.vehicle_id == v.id && (
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
                                        <input type="hidden" required value={formData.vehicle_id} />
                                    </div>
                                </div>

                                {currentUser.role !== 'empleado' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                                        <div className="relative" ref={statusDropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all flex justify-between items-center capitalize"
                                            >
                                                <span className={!formData.status ? 'text-slate-400' : ''}>
                                                    {formData.status || 'Seleccionar estado...'}
                                                </span>
                                                <svg className={`w-4 h-4 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {isStatusDropdownOpen && (
                                                <div className="absolute z-[60] mt-2 w-full bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                        {['pendiente', 'aprobada', 'rechazada'].map(s => (
                                                            <div
                                                                key={s}
                                                                onClick={() => {
                                                                    setFormData({ ...formData, status: s });
                                                                    setIsStatusDropdownOpen(false);
                                                                }}
                                                                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between capitalize
                                                                    ${formData.status === s
                                                                        ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium'
                                                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600/50'}`}
                                                            >
                                                                <span>{s}</span>
                                                                {formData.status === s && (
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <input type="hidden" required value={formData.status} />
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium shadow-sm shadow-blue-500/30 disabled:opacity-70 flex justify-center items-center"
                                >
                                    {formLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        editingId ? 'Guardar Cambios' : 'Crear Reserva'
                                    )}
                                </button>
                            </div>
                        </form>
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
