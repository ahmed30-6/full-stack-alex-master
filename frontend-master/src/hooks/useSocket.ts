// src/hooks/useSocket.ts

import { useEffect, useState, useCallback } from "react";
import { socketService, ConnectionStatus } from "../services/socketService";
import { auth } from "../firebase";
import type { Socket } from "socket.io-client";

/**
 * Hook return type
 */
interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  authenticated: boolean;
  status: ConnectionStatus;
  connect: () => void;
  disconnect: () => void;
}

/**
 * React hook for managing Socket.io connection
 *
 * ⚠️ SOCKET.IO TEMPORARILY DISABLED ⚠️
 * Returns dummy values to prevent connection attempts
 * All socket functionality is bypassed for stability
 *
 * Handles:
 * - Automatic connection on mount
 * - Authentication with Firebase token
 * - Connection status tracking
 * - Cleanup on unmount
 *
 * @returns Socket instance, connection state, and control functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { socket, connected, authenticated } = useSocket();
 *
 *   useEffect(() => {
 *     if (authenticated) {
 *       // Socket is ready to use
 *       socket?.emit('join:group', { groupId: '123' });
 *     }
 *   }, [authenticated, socket]);
 *
 *   return <div>Status: {connected ? 'Connected' : 'Disconnected'}</div>;
 * }
 * ```
 */
export function useSocket(): UseSocketReturn {
  // ⚠️ SOCKET.IO DISABLED - Return dummy values without connecting
  const [socket] = useState<Socket | null>(null);
  const [status] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);

  // Derived states - always false when disabled
  const connected = false;
  const authenticated = false;

  /**
   * Connect to socket server (NO-OP when disabled)
   */
  const connect = useCallback(() => {
    console.log("Socket.IO is disabled - connect() is a no-op");
    // socketService.connect(); // DISABLED
  }, []);

  /**
   * Disconnect from socket server (NO-OP when disabled)
   */
  const disconnect = useCallback(() => {
    console.log("Socket.IO is disabled - disconnect() is a no-op");
    // socketService.disconnect(); // DISABLED
  }, []);

  // ⚠️ ALL SOCKET INITIALIZATION DISABLED
  // Original code commented out below for reference:
  /*
  useEffect(() => {
    // Get socket instance
    const socketInstance = socketService.getSocket();
    setSocket(socketInstance);

    // Subscribe to status changes
    const unsubscribeStatus = socketService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // Initialize connection if not already connected
    if (!socketService.isConnected()) {
      socketService.connect();
    } else {
      // Update status if already connected
      setStatus(socketService.getConnectionStatus());
    }

    // Authenticate when connected
    const handleAuthentication = async () => {
      if (socketService.isConnected() && !socketService.isAuthenticated()) {
        try {
          const user = auth.currentUser;
          if (user) {
            const token = await user.getIdToken();
            await socketService.authenticate(token);
          }
        } catch (error) {
          console.error("Failed to authenticate socket:", error);
        }
      }
    };

    // Listen for connection to trigger authentication
    const checkAndAuth = () => {
      const currentStatus = socketService.getConnectionStatus();
      if (currentStatus === ConnectionStatus.CONNECTED) {
        handleAuthentication();
      }
    };

    // Subscribe to status changes for authentication
    const unsubscribeAuth = socketService.onStatusChange((newStatus) => {
      if (newStatus === ConnectionStatus.CONNECTED) {
        handleAuthentication();
      }
    });

    // Check immediately in case already connected
    checkAndAuth();

    // Update socket instance when status changes
    const updateSocket = () => {
      setSocket(socketService.getSocket());
    };
    const unsubscribeSocketUpdate = socketService.onStatusChange(updateSocket);

    // Cleanup on unmount
    return () => {
      unsubscribeStatus();
      unsubscribeAuth();
      unsubscribeSocketUpdate();
      // Note: We don't disconnect here to allow socket to persist across component remounts
      // Call disconnect() explicitly if you want to close the connection
    };
  }, []);
  */

  return {
    socket,
    connected,
    authenticated,
    status,
    connect,
    disconnect,
  };
}
