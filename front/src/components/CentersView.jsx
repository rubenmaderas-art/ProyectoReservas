import { useState, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import useIsMobile from '../hooks/useIsMobile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faCar, faUsers, faEye } from '@fortawesome/free-solid-svg-icons';

const INITIAL_FORM_STATE = { id_unifica: '', nombre: '', provincia: '', localidad: '', direccion: '', telefono: '', codigo_postal: '' };

const CentersView = ({ onModalChange }) => {
    const isMobile = useIsMobile();
    const [centres, setCentres] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [editingId, setEditingId] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');
    const [deleteId, setDeleteId] = useState(null);

    // Details State
    const [detailId, setDetailId] = useState(null);
    const [centreDetails, setCentreDetails] = useState({ vehicles: [], users: [] });
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Details Pagination State
    const [currentPageUsers, setCurrentPageUsers] = useState(1);
    const [currentPageVehicles, setCurrentPageVehicles] = useState(1);
    const detailsItemsPerPage = 5;

    // Sorting & Filter State
    const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [visibleItems, setVisibleItems] = useState(10);
    const itemsPerPage = 8;
    const scrollObserverRef = useRef(null);

    // Reset pagination when searching
    useEffect(() => {
        setCurrentPage(1);
        setVisibleItems(10);
    }, [searchTerm]);

    const sortedCentres = useMemo(() => {
        let sortableItems = [...centres];

        if (searchTerm.trim() !== '') {
            const query = searchTerm.toLowerCase().trim();
            sortableItems = sortableItems.filter(c =>
                c.nombre?.toLowerCase().includes(query) ||
                c.provincia?.toLowerCase().includes(query) ||
                c.localidad?.toLowerCase().includes(query) ||
                c.direccion?.toLowerCase().includes(query)
            );
        }

        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key] || '';
                const bValue = b[sortConfig.key] || '';

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
    }, [centres, sortConfig, searchTerm]);

    const paginatedCentres = useMemo(() => {
        if (isMobile) {
            return sortedCentres.slice(0, visibleItems);
        }
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedCentres.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedCentres, isMobile, visibleItems, currentPage]);

    const totalPages = Math.ceil(sortedCentres.length / itemsPerPage);

    const fetchCentres = async () => {
        try {
            const response = await fetch('http://localhost:4000/api/dashboard/centres', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            setCentres(data);
        } catch (error) {
            console.error('Error cargando centros:', error);
            toast.error('Error al cargar la lista de centros');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCentres();
    }, []);

    // Infinite Scroll Observer para la vista móvil
    useEffect(() => {
        if (!isMobile) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && visibleItems < sortedCentres.length) {
                setVisibleItems(prev => prev + 10);
            }
        }, { threshold: 0.1 });

        if (scrollObserverRef.current) {
            observer.observe(scrollObserverRef.current);
        }

        return () => observer.disconnect();
    }, [isMobile, sortedCentres.length, visibleItems]);

    // Bloquear scroll al abrir modal
    useEffect(() => {
        if (isModalOpen || deleteId || detailId) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isModalOpen, deleteId, detailId]);

    const handleOpenModal = (centre = null) => {
        setError('');
        if (centre) {
            setFormData({
                id_unifica: centre.id_unifica || '',
                nombre: centre.nombre || '',
                provincia: centre.provincia || '',
                localidad: centre.localidad || '',
                direccion: centre.direccion || '',
                telefono: centre.telefono || '',
                codigo_postal: centre.codigo_postal || ''
            });
            setEditingId(centre.id);
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

    const isValidCP = (cp) => /^\d{5}$/.test(cp) && parseInt(cp, 10) >= 1000 && parseInt(cp, 10) <= 52999;
    const isValidTelefono = (tel) => /^[6789]\d{8}$/.test(tel);

    const handleSave = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setError('');

        if (formData.codigo_postal && !isValidCP(formData.codigo_postal)) {
            setError('El código postal no es válido. Debe tener 5 dígitos (01000–52999).');
            setFormLoading(false);
            return;
        }

        if (formData.telefono && !isValidTelefono(formData.telefono)) {
            setError('El teléfono no es válido. Debe tener 9 dígitos y empezar por 6, 7, 8 o 9.');
            setFormLoading(false);
            return;
        }

        const isEditing = !!editingId;
        const currentEditingId = editingId;

        const url = isEditing
            ? `http://localhost:4000/api/dashboard/centres/${editingId}`
            : 'http://localhost:4000/api/dashboard/centres';

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
                throw new Error(data.error || 'Error al guardar el centro');
            }

            const savedId = String(data.id ?? currentEditingId ?? '');
            if (savedId) {
                recentlyCreatedByMeRef.current.add(savedId);
                setTimeout(() => recentlyCreatedByMeRef.current.delete(savedId), 5000);
            }

            await fetchReservations();
            handleCloseModal(); // esto pone editingId a null — pero ya tenemos currentEditingId
            if (onOperationComplete) onOperationComplete();


            toast.success(isEditing ? 'Centro actualizado' : 'Centro creado');
            await fetchCentres();
            handleCloseModal();
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

        const deletePromise = await fetch(`http://localhost:4000/api/dashboard/centres/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (deletePromise.ok) {
            toast.success('Centro eliminado');
            setCentres(centres.filter(c => c.id !== id));
        } else {
            const data = await deletePromise.json();
            toast.error(data.error || 'Error al eliminar el centro');
        }
    };

    const handleViewDetails = async (id) => {
        setDetailId(id);
        setDetailsLoading(true);
        setCurrentPageUsers(1);
        setCurrentPageVehicles(1);
        try {
            const response = await fetch(`http://localhost:4000/api/dashboard/centres/${id}/details`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            setCentreDetails(data);
        } catch (error) {
            console.error('Error cargando detalles:', error);
            toast.error('Error al cargar detalles del centro');
        } finally {
            setDetailsLoading(false);
        }
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
            <svg className="w-3 h-3 ml-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" />
            </svg>
        ) : (
            <svg className="w-3 h-3 ml-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
            </svg>
        );
    };

    return (
        <div className="relative h-full flex flex-col glass-card-solid rounded-3xl shadow-sm p-6 animate-fade-in transition-colors overflow-hidden">
            {/* CABECERA */}
            <div className="select-none flex flex-col gap-6 mb-6 shrink-0 w-full">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white shrink-0 flex items-center gap-2">
                        Centros
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className="select-none text-sm font-medium px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg whitespace-nowrap">
                            {sortedCentres.length} Registros
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-4 justify-between">
                    <div className="relative flex-1 min-w-[260px] max-w-xl">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por nombre, provincia, localidad..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 dark:text-slate-200"
                        />
                    </div>
                    <div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-primary hover:brightness-95 text-white px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors shadow-sm shadow-primary/20"
                        >
                            <span className="text-xl leading-none">+</span>
                            <span>Añadir Centro</span>
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                    <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-primary rounded-full animate-spin mb-4"></div>
                    <p className="italic">Cargando centros...</p>
                </div>
            ) : sortedCentres.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No hay centros registrados</p>
                </div>
            ) : (
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto form-scrollbar">
                        <table className="w-full text-sm text-left relative">
                            <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                                <tr className="select-none border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">
                                    <th onClick={() => requestSort('nombre')} className="py-4 px-4 text-center cursor-pointer hover:text-primary transition-colors group">
                                        <div className="flex items-center justify-center">Nombre {getSortIcon('nombre')}</div>
                                    </th>
                                    <th onClick={() => requestSort('localidad')} className="py-4 px-4 text-center cursor-pointer hover:text-primary transition-colors group">
                                        <div className="flex items-center justify-center">Localidad {getSortIcon('localidad')}</div>
                                    </th>
                                    <th onClick={() => requestSort('provincia')} className="py-4 px-4 text-center cursor-pointer hover:text-primary transition-colors group">
                                        <div className="flex items-center justify-center">Provincia {getSortIcon('provincia')}</div>
                                    </th>
                                    <th className="py-4 px-4 text-center">Opciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedCentres.map((c) => (
                                    <tr key={c.id} className="border-b border-slate-200/70 dark:border-slate-700/60 odd:bg-slate-50 even:bg-white dark:odd:bg-slate-800/40 dark:even:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="py-4 px-4 text-center font-bold text-slate-700 dark:text-white">
                                            <span
                                                className="inline-block max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap"
                                                title={c.nombre}
                                            >
                                                {c.nombre}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-center text-slate-500 dark:text-slate-400">{c.localidad || '---'}</td>
                                        <td className="py-4 px-4 text-center text-slate-500 dark:text-slate-400">{c.provincia || '---'}</td>
                                        <td className="py-4 px-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => handleViewDetails(c.id)}
                                                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title="Ver detalles (Vinculaciones)"
                                                >
                                                    <FontAwesomeIcon icon={faEye} className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenModal(c)}
                                                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/20 dark:hover:bg-primary/20 rounded-lg transition-colors mr-1"
                                                    title="Editar centro"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(c.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Eliminar centro"
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
                    </div>

                    {/* PAGINACIÓN */}
                    {totalPages > 1 && (
                        <div className="select-none flex items-center justify-between px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
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
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL CREAR/EDITAR */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-xl animate-modal-overlay">
                    <div className="bg-white dark:bg-slate-800 shadow-2xl w-full h-[92vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl rounded-t-[32px] overflow-hidden flex flex-col transform transition-all animate-modal-slide-up">
                        <div className="select-none p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                {editingId ? 'Editar Centro' : 'Añadir nuevo centro'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto form-scrollbar p-6 space-y-4">
                            {error && <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800/50">{error}</div>}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del centro</label>
                                    <input type="text" required maxLength={100} value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ID Unifica</label>
                                    <input type="text" maxLength={20} value={formData.id_unifica} onChange={e => setFormData({ ...formData, id_unifica: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código Postal</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={5}
                                        value={formData.codigo_postal}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setFormData({ ...formData, codigo_postal: val });
                                        }}
                                        className={`w-full px-4 py-2 rounded-xl border bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 outline-none transition-all ${
                                            formData.codigo_postal && !isValidCP(formData.codigo_postal)
                                                ? 'border-red-400 dark:border-red-500 focus:ring-red-300'
                                                : 'border-slate-300 dark:border-slate-600 focus:ring-primary'
                                        }`}
                                        placeholder="ej. 28001"
                                    />
                                    {formData.codigo_postal && !isValidCP(formData.codigo_postal) && (
                                        <p className="mt-1 text-xs text-red-500 dark:text-red-400">CP no válido (5 dígitos, 01000–52999)</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Provincia</label>
                                    <input type="text" maxLength={60} value={formData.provincia} onChange={e => setFormData({ ...formData, provincia: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Localidad</label>
                                    <input type="text" maxLength={80} value={formData.localidad} onChange={e => setFormData({ ...formData, localidad: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dirección</label>
                                    <input type="text" maxLength={150} value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={9}
                                        value={formData.telefono}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setFormData({ ...formData, telefono: val });
                                        }}
                                        className={`w-full px-4 py-2 rounded-xl border bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 outline-none transition-all ${
                                            formData.telefono && !isValidTelefono(formData.telefono)
                                                ? 'border-red-400 dark:border-red-500 focus:ring-red-300'
                                                : 'border-slate-300 dark:border-slate-600 focus:ring-primary'
                                        }`}
                                        placeholder="ej. 912345678"
                                    />
                                    {formData.telefono && !isValidTelefono(formData.telefono) && (
                                        <p className="mt-1 text-xs text-red-500 dark:text-red-400">Teléfono no válido (9 dígitos, empieza por 6, 7, 8 o 9)</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 py-4 sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 mt-6">
                                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium">Cancelar</button>
                                <button type="submit" disabled={formLoading} className="flex-1 px-4 py-2 bg-primary text-white rounded-xl font-medium shadow-sm shadow-primary/30 disabled:opacity-70 flex items-center justify-center">
                                    {formLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (editingId ? 'Guardar Cambios' : 'Añadir')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DETALLES (Usuarios y Vehículos) */}
            {detailId && (
                <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-xl animate-modal-overlay">
                    <div className="bg-white dark:bg-slate-800 shadow-2xl w-full h-[92vh] sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-3xl rounded-t-[32px] overflow-hidden flex flex-col transform transition-all animate-modal-slide-up">
                        <div className="select-none p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <div className="flex flex-col">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                    Detalles del Centro: {centres.find(c => c.id === detailId)?.nombre}
                                </h3>
                                <p className="text-sm text-slate-500">Usuarios y vehículos vinculados actualmente</p>
                            </div>
                            <button onClick={() => setDetailId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto form-scrollbar p-6">
                            {detailsLoading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-primary rounded-full animate-spin mb-4"></div>
                                    <p className="italic text-slate-400">Cargando vinculaciones...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* SECCIÓN USUARIOS */}
                                    <div className="space-y-4 flex flex-col">
                                        <h4 className="font-bold flex items-center gap-2 text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">
                                            <FontAwesomeIcon icon={faUsers} className="text-blue-500" />
                                            Usuarios ({centreDetails.users.length})
                                        </h4>
                                        <div className="space-y-2 flex-1 min-h-[150px]">
                                            {centreDetails.users.length === 0 ? (
                                                <p className="text-sm text-slate-400 italic">No hay usuarios vinculados</p>
                                            ) : (
                                                centreDetails.users
                                                    .slice((currentPageUsers - 1) * detailsItemsPerPage, currentPageUsers * detailsItemsPerPage)
                                                    .map(u => (
                                                        <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-slate-700 dark:text-slate-200">{u.username}</span>
                                                                <span className="text-[10px] uppercase text-slate-400">{u.role}</span>
                                                            </div>
                                                            <FontAwesomeIcon icon={faUsers} className="text-slate-300 dark:text-slate-600 text-xs" />
                                                        </div>
                                                    ))
                                            )}
                                        </div>
                                        {/* Paginación Usuarios */}
                                        {centreDetails.users.length > detailsItemsPerPage && (
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                                <button
                                                    onClick={() => setCurrentPageUsers(prev => Math.max(1, prev - 1))}
                                                    disabled={currentPageUsers === 1}
                                                    className="p-1 px-2 text-xs bg-slate-100 dark:bg-slate-700 rounded-lg disabled:opacity-30"
                                                >Anterior</button>
                                                <span className="text-[10px] text-slate-500">{currentPageUsers} / {Math.ceil(centreDetails.users.length / detailsItemsPerPage)}</span>
                                                <button
                                                    onClick={() => setCurrentPageUsers(prev => Math.min(Math.ceil(centreDetails.users.length / detailsItemsPerPage), prev + 1))}
                                                    disabled={currentPageUsers === Math.ceil(centreDetails.users.length / detailsItemsPerPage)}
                                                    className="p-1 px-2 text-xs bg-slate-100 dark:bg-slate-700 rounded-lg disabled:opacity-30"
                                                >Siguiente</button>
                                            </div>
                                        )}
                                    </div>

                                    {/* SECCIÓN VEHÍCULOS */}
                                    <div className="space-y-4 flex flex-col">
                                        <h4 className="font-bold flex items-center gap-2 text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">
                                            <FontAwesomeIcon icon={faCar} className="text-green-500" />
                                            Vehículos ({centreDetails.vehicles.length})
                                        </h4>
                                        <div className="space-y-2 flex-1 min-h-[150px]">
                                            {centreDetails.vehicles.length === 0 ? (
                                                <p className="text-sm text-slate-400 italic">No hay vehículos vinculados</p>
                                            ) : (
                                                centreDetails.vehicles
                                                    .slice((currentPageVehicles - 1) * detailsItemsPerPage, currentPageVehicles * detailsItemsPerPage)
                                                    .map(v => (
                                                        <div key={v.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-slate-700 dark:text-slate-200">{v.license_plate}</span>
                                                                <span className="text-[10px] uppercase text-slate-400">{v.model}</span>
                                                            </div>
                                                            <div className={`w-2 h-2 rounded-full ${v.status === 'disponible' ? 'bg-green-500' : 'bg-amber-500'}`} title={v.status} />
                                                        </div>
                                                    ))
                                            )}
                                        </div>
                                        {/* Paginación Vehículos */}
                                        {centreDetails.vehicles.length > detailsItemsPerPage && (
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                                <button
                                                    onClick={() => setCurrentPageVehicles(prev => Math.max(1, prev - 1))}
                                                    disabled={currentPageVehicles === 1}
                                                    className="p-1 px-2 text-xs bg-slate-100 dark:bg-slate-700 rounded-lg disabled:opacity-30"
                                                >Anterior</button>
                                                <span className="text-[10px] text-slate-500">{currentPageVehicles} / {Math.ceil(centreDetails.vehicles.length / detailsItemsPerPage)}</span>
                                                <button
                                                    onClick={() => setCurrentPageVehicles(prev => Math.min(Math.ceil(centreDetails.vehicles.length / detailsItemsPerPage), prev + 1))}
                                                    disabled={currentPageVehicles === Math.ceil(centreDetails.vehicles.length / detailsItemsPerPage)}
                                                    className="p-1 px-2 text-xs bg-slate-100 dark:bg-slate-700 rounded-lg disabled:opacity-30"
                                                >Siguiente</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ELIMINAR */}
            {deleteId && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-xl animate-modal-overlay" onClick={() => setDeleteId(null)} />
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full relative z-10 shadow-2xl animate-scale-in border border-slate-200 dark:border-slate-700">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-center text-slate-800 dark:text-white mb-2">¿Eliminar Centro?</h3>
                        <p className="text-red-500 dark:text-red-400 text-center text-sm font-semibold mb-8">
                            ¡ATENCIÓN! Esta acción eliminará el centro y TODOS sus vehículos, reservas y documentos asociados de forma irreversible.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200">Cancelar</button>
                            <button onClick={confirmDelete} className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CentersView;
