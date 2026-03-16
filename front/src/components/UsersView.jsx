import { useState, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import useIsMobile from '../hooks/useIsMobile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const INITIAL_FORM_STATE = { username: '', password: '', role: 'empleado' };

const STATUS_STYLES = {
    'empleado': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'admin': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'supervisor': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

const UsersView = ({ onModalChange }) => {
    const isMobile = useIsMobile();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [editingId, setEditingId] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');
    const [deleteId, setDeleteId] = useState(null);
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
    const roleDropdownRef = useRef(null);
    
    const allowPageFlow = false;

    // Sorting & Filter State
    const [sortConfig, setSortConfig] = useState({ key: 'username', direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [visibleItems, setVisibleItems] = useState(10);
    const itemsPerPage = 9;
    const scrollObserverRef = useRef(null);

    // Reset pagination when searching
    useEffect(() => {
        setCurrentPage(1);
        setVisibleItems(10);
    }, [searchTerm]);

    const sortedUsers = useMemo(() => {
        let sortableItems = [...users];

        // Aplicar búsqueda global
        if (searchTerm.trim() !== '') {
            const query = searchTerm.toLowerCase().trim();
            sortableItems = sortableItems.filter(u =>
                u.username?.toLowerCase().includes(query) ||
                u.role?.toLowerCase().includes(query)
            );
        }

        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

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
        return sortableItems;
    }, [users, sortConfig, searchTerm]);

    const paginatedUsers = useMemo(() => {
        if (isMobile) {
            return sortedUsers.slice(0, visibleItems);
        }
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedUsers.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedUsers, isMobile, visibleItems, currentPage]);

    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

    const fetchUsers = async () => {
        try {
            const response = await fetch('http://localhost:4000/api/dashboard/users', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')} ` }
            });
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            console.error('Error cargando usuarios:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();

        // Cerrar dropdown al hacer click fuera
        const handleClickOutside = (event) => {
            if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
                setIsRoleDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Infinite Scroll Observer para la vista móvil
    useEffect(() => {
        if (!isMobile) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && visibleItems < sortedUsers.length) {
                setVisibleItems(prev => prev + 10);
            }
        }, { threshold: 0.1 });

        if (scrollObserverRef.current) {
            observer.observe(scrollObserverRef.current);
        }

        return () => observer.disconnect();
    }, [isMobile, sortedUsers.length, visibleItems]);

    // Bloquear scroll al abrir modal
    useEffect(() => {
        if (isModalOpen || deleteId) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isModalOpen, deleteId]);

    const handleOpenModal = (user = null) => {
        setError('');
        if (user) {
            setFormData({ username: user.username, password: '', role: user.role });
            setEditingId(user.id);
        } else {
            setFormData(INITIAL_FORM_STATE);
            setEditingId(null);
        }
        setIsModalOpen(true);
        onModalChange?.(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData(INITIAL_FORM_STATE);
        setEditingId(null);
        onModalChange?.(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setError('');

        const isEditing = !!editingId;
        const url = isEditing
            ? `http://localhost:4000/api/dashboard/users/${editingId}`
            : 'http://localhost:4000/api/dashboard/users';

        // El password es obligatorio solo si estamos creando
        if (!isEditing && !formData.password) {
            setError('La contraseña es obligatoria para nuevos usuarios');
            setFormLoading(false);
            return;
        }

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
                throw new Error(data.error || 'Error al guardar el usuario');
            }

            await fetchUsers();
            handleCloseModal();
            toast.success(isEditing ? '¡Usuario actualizado!' : '¡Usuario creado!');
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

        const deletePromise = fetch(`http://localhost:4000/api/dashboard/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        toast.promise(deletePromise, {
            loading: 'Eliminando...',
            success: () => {
                setUsers(users.filter(u => u.id !== id));
                return 'Usuario eliminado';
            },
            error: 'Error al eliminar el usuario',
        });
    };



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

    return (
        <div className="relative h-full flex flex-col bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6 animate-fade-in transition-colors overflow-hidden">
            {isMobile ? (
                // --- CABECERA MÓVIL (2 filas) ---
                <div className="flex flex-col gap-4 mb-6">
                    {/* Fila 1: Título, Buscador, Contador */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white shrink-0">Usuarios</h2>
                            <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg whitespace-nowrap">
                                {sortedUsers.length} usuarios
                            </span>
                        </div>
                        <div className="relative w-full">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por nombre o rol..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    {/* Fila 2: Añadir a la derecha */}
                    <div className="flex justify-end">
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-medium text-sm flex items-center transition-colors shadow-sm shadow-blue-500/20"
                            title="Añadir usuario" >
                            <span className="text-lg mr-1 leading-none">+</span>
                            <span>Agregar usuario</span>
                        </button>
                    </div>
                </div>
            ) : (
                // --- CABECERA DESKTOP (1 fila) ---
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white shrink-0">Usuarios</h2>
                        <div className="relative flex-1 max-w-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por nombre o rol..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-200"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-medium text-sm flex items-center transition-colors shadow-sm shadow-blue-500/20"
                            title="Añadir usuario" >
                            <span className="text-lg mr-1 leading-none">+</span>
                            <span>Agregar usuario</span>
                        </button>
                        <span className="text-sm font-medium px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg">
                            {sortedUsers.length} usuarios
                        </span>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                    <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin mb-4"></div>
                    <p className="italic">Cargando usuarios...</p>
                </div>
            ) : users.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No hay usuarios registrados</p>
                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Los usuarios aparecerán aquí una vez registrados.</p>
                </div>
            ) : isMobile ? (
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {paginatedUsers.map((u) => (
                        <div
                            key={u.id}
                            className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 shadow-sm hover:border-blue-300 dark:hover:border-blue-800 transition-all group"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                                        {u.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-base leading-tight">{u.username}</h3>
                                        <span className={`chip-uniform mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {u.role}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleOpenModal(u)}
                                        className="p-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-100 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(u.id)}
                                        className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {visibleItems < sortedUsers.length && (
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
                                            Nombre {getSortIcon('username')}
                                        </div>
                                    </th>
                                    <th onClick={() => requestSort('role')} className="pb-3 px-4 text-center cursor-pointer hover:text-blue-600 transition-colors group">
                                        <div className="flex items-center justify-center">
                                            Rol {getSortIcon('role')}
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
                                {paginatedUsers.map((u) => (
                                    <tr key={u.id} className="border-b border-slate-200/70 dark:border-slate-700/60 odd:bg-slate-50 even:bg-white dark:odd:bg-slate-800/40 dark:even:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-200">{u.username}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`chip-uniform px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center ">
                                            <button
                                                onClick={() => handleOpenModal(u)}
                                                className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors mr-1"
                                                title="Editar usuario"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>

                                            <button
                                                onClick={() => handleDeleteClick(u.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Eliminar usuario"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
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
                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
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
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                                    currentPage === page 
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
                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
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

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-xl animate-modal-overlay">
                    <div className="bg-white dark:bg-slate-800 shadow-2xl w-full h-[92vh] sm:h-full sm:max-w-4xl sm:rounded-3xl rounded-t-[32px] overflow-hidden flex flex-col transform transition-all animate-modal-slide-up">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800/50">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                {editingId ? 'Editar Usuario' : 'Añadir Nuevo Usuario'}
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

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre de Usuario</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="ej. Usuario123"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Contraseña {editingId && <span className="text-xs text-slate-400 font-normal">(dejar en blanco para no cambiar)</span>}
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingId}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rol</label>
                                    <div className="relative" ref={roleDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all flex justify-between items-center capitalize"
                                        >
                                            <span className={!formData.role ? 'text-slate-400' : ''}>
                                                {formData.role || 'Seleccionar rol...'}
                                            </span>
                                            <svg className={`w-4 h-4 transition-transform duration-200 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {isRoleDropdownOpen && (
                                            <div className="absolute z-[60] mt-2 w-full bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                    {['empleado', 'supervisor', 'admin'].map(r => (
                                                        <div
                                                            key={r}
                                                            onClick={() => {
                                                                setFormData({ ...formData, role: r });
                                                                setIsRoleDropdownOpen(false);
                                                            }}
                                                            className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between capitalize
                                                                ${formData.role === r
                                                                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium'
                                                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600/50'}`}
                                                        >
                                                            <span>{r === 'admin' ? 'Administrador' : r}</span>
                                                            {formData.role === r && (
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
                                    <input type="hidden" required value={formData.role} />
                                </div>
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
                                        editingId ? 'Guardar Cambios' : 'Añadir'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteId && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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
                            Esta acción eliminará al usuario permanentemente y no se puede deshacer.
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
};

export default UsersView;
