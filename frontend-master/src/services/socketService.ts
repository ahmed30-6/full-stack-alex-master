// src/services/socketService.ts

import { io, Socket } from "socket.io-client";
import { auth } from "../firebase";
import type { SocketEvents } from "../../types";

// Global flag to safely disable all Socket.IO activity without removing code
export const SOCKET_IO_DISABLED = true;

/**
 * Connection status enum
 */
export enum ConnectionStatus {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  AUTHENTICATED = "authenticated",
  ERROR = "error",
}

/**
 * Socket event handler type
 */
type EventHandler = (...args: any[]) => void;

/**
 * Socket.io service for managing real-time connections
 *
 * Handles:
 * - Connection lifecycle
 * - Authentication with Firebase tokens
 * - Event subscription/unsubscription
 * - Reconnection logic
 * - Error handling
 */
export class SocketService {
  private socket: Socket | null = null;
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private lastToken: string | null = null;
  private wasConnected: boolean = false;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private errorHandlers: Set<EventHandler> = new Set();
  private statusChangeHandlers: Set<(status: ConnectionStatus) => void> =
    new Set();
  private userGroups: string[] = [];

  /**
   * Get the Socket.io server URL from environment or default
   */
  private getServerUrl(): string {
    const apiBase =
      (import.meta as any).env?.VITE_API_BASE ||
      "https://backend-adaptive-collearning.up.railway.app";

    // Remove /api suffix if present
    return apiBase.replace(/\/api$/, "");
  }

  /**
   * Initialize and connect to Socket.io server
   */
  connect(): void {
    if (SOCKET_IO_DISABLED) {
      console.log("Socket.IO is disabled - skipping connect()");
      return;
    }
    if (this.socket?.connected) {
      console.log("Socket already connected");
      return;
    }

    const serverUrl = this.getServerUrl();
    console.log("Connecting to Socket.io server:", serverUrl);

    this.setStatus(ConnectionStatus.CONNECTING);

    this.socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    this.setupEventHandlers();
  }

  /**
   * Set up core socket event handlers
   */
  private setupEventHandlers(): void {
    if (SOCKET_IO_DISABLED) return;
    if (!this.socket) return;

    // Connection successful
    this.socket.on("connect", async () => {
      console.log("Socket connected:", this.socket?.id);
      this.setStatus(ConnectionStatus.CONNECTED);

      // If this is a reconnection, re-authenticate
      if (this.wasConnected && this.lastToken) {
        console.log("Reconnection detected, re-authenticating...");
        await this.authenticate(this.lastToken);
        this.rejoinGroups();
      }

      this.wasConnected = true;
    });

    // Connection error
    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      this.setStatus(ConnectionStatus.ERROR);
      this.notifyErrorHandlers({
        message: `Connection error: ${error.message}`,
      });
    });

    // Disconnected
    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      this.setStatus(ConnectionStatus.DISCONNECTED);
    });

    // Authentication successful
    this.socket.on(
      "authenticated",
      (data: { userId: string; groups: string[] }) => {
        console.log("Socket authenticated:", data.userId);
        console.log("User groups:", data.groups);
        this.userGroups = data.groups || [];
        this.setStatus(ConnectionStatus.AUTHENTICATED);
      }
    );

    // Error from server
    this.socket.on("error", (error: { message: string }) => {
      console.error("Socket error:", error.message);

      if (
        error.message === "Authentication required" ||
        error.message === "Authentication failed"
      ) {
        console.log("Authentication error, attempting to re-authenticate...");
        this.reauthenticate();
      }

      this.notifyErrorHandlers(error);
    });
  }

  /**
   * Authenticate the socket connection with Firebase token
   */
  async authenticate(token?: string): Promise<void> {
    if (SOCKET_IO_DISABLED) {
      console.log("Socket.IO is disabled - skipping authenticate()");
      return;
    }
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }

    try {
      // Get fresh token from Firebase if not provided
      const authToken = token || (await auth.currentUser?.getIdToken(true));

      if (!authToken) {
        throw new Error("No authentication token available");
      }

      this.lastToken = authToken;

      // Emit authentication event
      this.socket.emit("authenticate", { token: authToken });

      console.log("Authentication request sent");
    } catch (error) {
      console.error("Authentication failed:", error);
      throw error;
    }
  }

  /**
   * Re-authenticate with a fresh token
   */
  private async reauthenticate(): Promise<void> {
    if (SOCKET_IO_DISABLED) return;
    try {
      const freshToken = await auth.currentUser?.getIdToken(true);
      if (freshToken) {
        await this.authenticate(freshToken);
      }
    } catch (error) {
      console.error("Re-authentication failed:", error);
    }
  }

  /**
   * Re-join all groups after reconnection
   */
  private rejoinGroups(): void {
    if (SOCKET_IO_DISABLED) return;
    if (!this.socket || this.userGroups.length === 0) return;

    console.log("Re-joining groups:", this.userGroups);
    this.userGroups.forEach((groupId) => {
      this.socket?.emit("join:group", { groupId });
    });
  }

  /**
   * Disconnect from Socket.io server
   */
  disconnect(): void {
    if (SOCKET_IO_DISABLED) {
      console.log("Socket.IO is disabled - skipping disconnect()");
      this.socket = null;
      this.setStatus(ConnectionStatus.DISCONNECTED);
      this.wasConnected = false;
      this.lastToken = null;
      this.userGroups = [];
      return;
    }
    if (this.socket) {
      console.log("Disconnecting socket...");
      this.socket.close();
      this.socket = null;
      this.setStatus(ConnectionStatus.DISCONNECTED);
      this.wasConnected = false;
      this.lastToken = null;
      this.userGroups = [];
    }
  }

  /**
   * Subscribe to a socket event with type safety
   *
   * @template K - Event name from SocketEvents
   * @param event - The event name to subscribe to
   * @param handler - Callback function with typed payload
   */
  on<K extends keyof SocketEvents>(
    event: K,
    handler: (data: SocketEvents[K]) => void
  ): void;
  on(event: string, handler: EventHandler): void;
  on(event: string, handler: EventHandler): void {
    if (SOCKET_IO_DISABLED) {
      console.log("Socket.IO is disabled - skipping on()", event);
      return;
    }
    if (!this.socket) {
      console.warn("Socket not initialized, cannot subscribe to event:", event);
      return;
    }

    // Track handler for cleanup
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Subscribe to socket event
    this.socket.on(event, handler);
  }

  /**
   * Unsubscribe from a socket event with type safety
   *
   * @template K - Event name from SocketEvents
   * @param event - The event name to unsubscribe from
   * @param handler - Optional specific handler to remove
   */
  off<K extends keyof SocketEvents>(
    event: K,
    handler?: (data: SocketEvents[K]) => void
  ): void;
  off(event: string, handler?: EventHandler): void;
  off(event: string, handler?: EventHandler): void {
    if (SOCKET_IO_DISABLED) return;
    if (!this.socket) return;

    if (handler) {
      // Remove specific handler
      this.socket.off(event, handler);
      this.eventHandlers.get(event)?.delete(handler);
    } else {
      // Remove all handlers for this event
      this.socket.off(event);
      this.eventHandlers.delete(event);
    }
  }

  /**
   * Emit an event to the server
   */
  emit(event: string, data?: any): void {
    if (SOCKET_IO_DISABLED) {
      console.log("Socket.IO is disabled - skipping emit()", event);
      return;
    }
    if (!this.socket?.connected) {
      console.warn("Socket not connected, cannot emit event:", event);
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Check if socket is authenticated
   */
  isAuthenticated(): boolean {
    return this.connectionStatus === ConnectionStatus.AUTHENTICATED;
  }

  /**
   * Get the socket instance (for advanced usage)
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(handler: (status: ConnectionStatus) => void): () => void {
    this.statusChangeHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.statusChangeHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to error events
   */
  onError(handler: EventHandler): () => void {
    this.errorHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  /**
   * Set connection status and notify listeners
   */
  private setStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      console.log("Connection status changed:", status);

      // Notify all status change handlers
      this.statusChangeHandlers.forEach((handler) => {
        try {
          handler(status);
        } catch (error) {
          console.error("Error in status change handler:", error);
        }
      });
    }
  }

  /**
   * Notify all error handlers
   */
  private notifyErrorHandlers(error: any): void {
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (err) {
        console.error("Error in error handler:", err);
      }
    });
  }

  /**
   * Join a group room
   */
  joinGroup(groupId: string): void {
    if (SOCKET_IO_DISABLED) return;
    if (!this.isAuthenticated()) {
      console.warn("Cannot join group: not authenticated");
      return;
    }

    console.log("Joining group:", groupId);
    this.emit("join:group", { groupId });

    // Track group for reconnection
    if (!this.userGroups.includes(groupId)) {
      this.userGroups.push(groupId);
    }
  }

  /**
   * Leave a group room
   */
  leaveGroup(groupId: string): void {
    if (SOCKET_IO_DISABLED) return;
    if (!this.socket?.connected) {
      console.warn("Cannot leave group: not connected");
      return;
    }

    console.log("Leaving group:", groupId);
    this.emit("leave:group", { groupId });

    // Remove from tracked groups
    this.userGroups = this.userGroups.filter((id) => id !== groupId);
  }

  /**
   * Get list of groups user has joined
   */
  getUserGroups(): string[] {
    return [...this.userGroups];
  }
}

// Export singleton instance
export const socketService = new SocketService();
