import { useEffect, useMemo, useRef } from 'react';
import { getUserCentreIds } from '../utils/reservationsViewHelpers';

export const useReservationRealtimeNotifications = ({
  socket,
  isConnected,
  currentUser,
  enabled = true,
  onNewReservation,
  onUpdatedReservation,
  onDeletedReservation,
}) => {
  const callbacksRef = useRef({
    onNewReservation,
    onUpdatedReservation,
    onDeletedReservation,
  });
  const recentEventKeysRef = useRef(new Map());

  useEffect(() => {
    callbacksRef.current = {
      onNewReservation,
      onUpdatedReservation,
      onDeletedReservation,
    };
  }, [onNewReservation, onUpdatedReservation, onDeletedReservation]);

  const userCentreIds = useMemo(() => getUserCentreIds(currentUser), [currentUser]);
  const currentRole = currentUser?.role ?? '';
  const isAdmin = currentRole === 'admin';
  const isSupervisor = currentRole === 'supervisor';
  const isEmployeeOrGestor = currentRole === 'empleado' || currentRole === 'gestor';

  const isDuplicateEvent = (eventName, reservationId) => {
    const key = `${eventName}:${String(reservationId ?? '')}`;
    const now = Date.now();
    const lastSeen = recentEventKeysRef.current.get(key) ?? 0;

    if (now - lastSeen < 2500) {
      return true;
    }

    recentEventKeysRef.current.set(key, now);

    for (const [storedKey, timestamp] of recentEventKeysRef.current.entries()) {
      if (now - timestamp > 5000) {
        recentEventKeysRef.current.delete(storedKey);
      }
    }

    return false;
  };

  useEffect(() => {
    if (!socket || !isConnected || !currentUser || !enabled) {
      return undefined;
    }

    if (isAdmin) {
      socket.emit('admin_dashboard_open', currentUser.id);
    }

    if ((isSupervisor || isEmployeeOrGestor) && userCentreIds.length > 0) {
      userCentreIds.forEach((centreId) => {
        socket.emit('join_centre', centreId);
      });
    }

    const buildMeta = (reservation) => {
      const reservationCentreId = String(reservation?.centre_id ?? '');
      const isOwnReservation = String(reservation?.user_id ?? '') === String(currentUser.id);
      const isInUserCentres = isAdmin
        ? true
        : userCentreIds.includes(reservationCentreId);

      return {
        isAdmin,
        isSupervisor,
        isEmployeeOrGestor,
        isOwnReservation,
        isInUserCentres,
        userCentreIds,
      };
    };

    const handleNewReservation = (reservation) => {
      if (!reservation) return;
      if (isDuplicateEvent('new_reservation', reservation.id)) return;
      callbacksRef.current.onNewReservation?.(reservation, buildMeta(reservation));
    };

    const handleUpdatedReservation = (reservation) => {
      if (!reservation) return;
      if (isDuplicateEvent('updated_reservation', reservation.id)) return;
      callbacksRef.current.onUpdatedReservation?.(reservation, buildMeta(reservation));
    };

    const handleDeletedReservation = (payload) => {
      if (!payload) return;
      if (isDuplicateEvent('deleted_reservation', payload.id)) return;
      callbacksRef.current.onDeletedReservation?.(payload, {
        isAdmin,
        isSupervisor,
        isEmployeeOrGestor,
        userCentreIds,
      });
    };

    socket.on('new_reservation', handleNewReservation);
    socket.on('updated_reservation', handleUpdatedReservation);
    socket.on('deleted_reservation', handleDeletedReservation);

    return () => {
      socket.off('new_reservation', handleNewReservation);
      socket.off('updated_reservation', handleUpdatedReservation);
      socket.off('deleted_reservation', handleDeletedReservation);

      if ((isSupervisor || isEmployeeOrGestor) && userCentreIds.length > 0) {
        userCentreIds.forEach((centreId) => {
          socket.emit('leave_centre', centreId);
        });
      }
    };
  }, [
    socket,
    isConnected,
    currentUser,
    enabled,
    isAdmin,
    isSupervisor,
    isEmployeeOrGestor,
    userCentreIds,
  ]);

  return {
    isAdmin,
    isSupervisor,
    isEmployeeOrGestor,
    userCentreIds,
  };
};
