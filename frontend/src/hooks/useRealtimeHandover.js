import { useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:4000';

/**
 * Custom hook for client-side real-time transaction updates via Socket.io.
 * 
 * @param {string} userId - ID of the active user (Collector or Aggregator)
 * @param {Function} onHandoverUpdate - Callback executed on incoming handover events
 */
export const useRealtimeHandover = (userId, onHandoverUpdate) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    // Establish WebSocket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    // Join user-specific socket room
    socket.emit('join_room', userId);

    // Listen for incoming handover requests (Aggregator perspective)
    socket.on('handover_requested', (data) => {
      if (onHandoverUpdate) {
        onHandoverUpdate({ type: 'REQUESTED', data });
      }
    });

    // Listen for completed handover confirmation (Collector perspective)
    socket.on('handover_completed', (data) => {
      if (onHandoverUpdate) {
        onHandoverUpdate({ type: 'COMPLETED', data });
      }
    });

    // Clean up socket instance on unmount or userId change
    return () => {
      socket.off('handover_requested');
      socket.off('handover_completed');
      socket.disconnect();
    };
  }, [userId, onHandoverUpdate]);

  // Emit event to initiate a handover request
  const sendHandoverRequest = useCallback((aggregatorId, transactionData) => {
    if (socketRef.current) {
      socketRef.current.emit('initiate_handover', { aggregatorId, transactionData });
    }
  }, []);

  // Emit event to confirm completion of a handover
  const confirmHandoverComplete = useCallback((collectorId, transactionId) => {
    if (socketRef.current) {
      socketRef.current.emit('complete_handover', {
        collectorId,
        transactionId,
        status: 'COMPLETED',
      });
    }
  }, []);

  return { sendHandoverRequest, confirmHandoverComplete };
};

export default useRealtimeHandover;