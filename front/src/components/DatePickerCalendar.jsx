import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';

const DatePickerCalendar = ({ isOpen, onClose, onSelect, initialDate }) => {
  const [displayYear, setDisplayYear] = useState(initialDate ? new Date(initialDate).getFullYear() : new Date().getFullYear());
  const [displayMonth, setDisplayMonth] = useState(initialDate ? new Date(initialDate).getMonth() : new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(initialDate ? new Date(initialDate).getDate() : null);
  const containerRef = useRef(null);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const dayNames = ["L", "M", "X", "J", "V", "S", "D"];

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

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const handleMonthChange = (direction) => {
    setDisplayMonth(prev => {
      let newMonth = prev + direction;
      let newYear = displayYear;
      if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      } else if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      }
      setDisplayYear(newYear);
      return newMonth;
    });
    setSelectedDay(null);
  };

  const handleYearChange = (direction) => {
    setDisplayYear(prev => prev + direction);
    setSelectedDay(null);
  };

  const handleDaySelect = (day) => {
    const pad = (n) => String(n).padStart(2, '0');
    const dateString = `${displayYear}-${pad(displayMonth + 1)}-${pad(day)}`;
    onSelect(dateString);
    onClose();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(displayMonth, displayYear);
    const firstDay = getFirstDayOfMonth(displayMonth, displayYear);
    const days = [];

    // Ajustar para que lunes sea primer día (firstDay 0 es domingo, así que restamos 1)
    const startingPosition = firstDay === 0 ? 6 : firstDay - 1;

    // Días del mes anterior
    const prevMonthDays = getDaysInMonth(displayMonth - 1, displayYear);
    for (let i = startingPosition - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        isToday: false
      });
    }

    // Días del mes actual
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = i === today.getDate() && displayMonth === today.getMonth() && displayYear === today.getFullYear();
      days.push({
        day: i,
        isCurrentMonth: true,
        isToday
      });
    }

    // Días del próximo mes
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        isToday: false
      });
    }

    return days;
  };

  if (!isOpen) return null;

  const days = generateCalendarDays();
  const pad = (n) => String(n).padStart(2, '0');
  const today = new Date();

  return (
    <div className="fixed inset-0 z-[50000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        ref={containerRef}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-[95vw] max-w-sm animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => handleMonthChange(-1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-colors"
            aria-label="Mes anterior"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
          </button>
          <div className="flex flex-col items-center">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
              {monthNames[displayMonth]} {displayYear}
            </h3>
          </div>
          <button
            onClick={() => handleMonthChange(1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-colors"
            aria-label="Próximo mes"
          >
            <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
          </button>
        </div>

        {/* Year navigation */}
        <div className="flex items-center justify-between mb-4 px-2">
          <button
            onClick={() => handleYearChange(-1)}
            className="p-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            ← {displayYear - 1}
          </button>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{displayYear}</span>
          <button
            onClick={() => handleYearChange(1)}
            className="p-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            {displayYear + 1} →
          </button>
        </div>

        {/* Day names header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-bold text-slate-600 dark:text-slate-400 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1 mb-6">
          {days.map((dayObj, index) => {
            const isSelected = dayObj.isCurrentMonth && dayObj.day === selectedDay;
            const isToday = dayObj.isToday;

            return (
              <button
                key={index}
                onClick={() => dayObj.isCurrentMonth && handleDaySelect(dayObj.day)}
                disabled={!dayObj.isCurrentMonth}
                className={`p-2 text-sm rounded-lg font-medium transition-all ${
                  !dayObj.isCurrentMonth
                    ? 'text-slate-300 dark:text-slate-600 cursor-default'
                    : isSelected
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : isToday
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white border-2 border-primary/50'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {dayObj.day}
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold text-sm transition-all hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (selectedDay) {
                const dateString = `${displayYear}-${pad(displayMonth + 1)}-${pad(selectedDay)}`;
                onSelect(dateString);
                onClose();
              }
            }}
            disabled={!selectedDay}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 transition-all ${
              selectedDay
                ? 'bg-primary text-white hover:brightness-95'
                : 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
            }`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatePickerCalendar;
