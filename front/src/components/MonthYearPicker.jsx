import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const MonthYearPicker = ({ isOpen, onClose, onSelect, initialMonth, initialYear }) => {
  const [displayYear, setDisplayYear] = useState(initialYear || new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initialMonth || new Date().getMonth());
  const containerRef = useRef(null);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleConfirm = () => {
    onSelect(selectedMonth, displayYear);
    onClose();
  };

  const handleYearChange = (direction) => {
    setDisplayYear(prev => prev + direction);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[50000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        ref={containerRef}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-[95vw] max-w-sm animate-in fade-in zoom-in duration-200"
      >
        {/* Header con año */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => handleYearChange(-1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-colors"
            aria-label="Año anterior"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
          </button>
          <h3 className="font-bold text-lg text-slate-800 dark:text-white min-w-[100px] text-center">
            {displayYear}
          </h3>
          <button
            onClick={() => handleYearChange(1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-colors"
            aria-label="Próximo año"
          >
            <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
          </button>
        </div>

        {/* Grid de meses */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {monthNames.map((month, index) => (
            <button
              key={index}
              onClick={() => setSelectedMonth(index)}
              className={`py-3 px-2 rounded-xl text-sm font-bold transition-all ${
                index === selectedMonth
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {month.substring(0, 3)}
            </button>
          ))}
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold text-sm transition-all hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-95 transition-all"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonthYearPicker;
