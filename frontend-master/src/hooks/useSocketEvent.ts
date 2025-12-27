// src/hooks/useSocketEvent.ts

import { useEffect, useRef } from "react";
import { socketService, SOCKET_IO_DISABLED } from "../services/socketService";
import type { SocketEvents } from "../../types";

/**
 * React hook for subscribing to Socket.io events with type safety
 *
 * Handles:
 * - Event subscription on mount or when dependencies change
 * - Automatic cleanup on unmount
 * - Re-subscription when dependencies change
 * - Stable handler reference to prevent unnecessary re-subscriptions
 *
 * @template K - Event name from SocketEvents (for type safety)
 * @param eventName - The socket event name to listen to
 * @param handler - The callback function to handle the event
 * @param dependencies - Array of dependencies that trigger re-subscription
 *
 * @example
 * ```tsx
 * function ChatComponent({ groupId }) {
 *   const [messages, setMessages] = useState([]);
 *
 *   useSocketEvent(
 *     'message:new',
 *     (message) => {
 *       if (message.groupId === groupId) {
 *         setMessages(prev => [...prev, message]);
 *       }
 *     },
 *     [groupId]
 *   );
 *
 *   return <div>{messages.map(m => <div key={m._id}>{m.text}</div>)}</div>;
 * }
 * ```
 */
export function useSocketEvent<K extends keyof SocketEvents>(
  eventName: K,
  handler: (data: SocketEvents[K]) => void,
  dependencies?: any[]
): void;
export function useSocketEvent<T = any>(
  eventName: string,
  handler: (data: T) => void,
  dependencies?: any[]
): void;
export function useSocketEvent<T = any>(
  eventName: string,
  handler: (data: T) => void,
  dependencies: any[] = []
): void {
  // Use ref to store the latest handler without causing re-subscriptions
  const handlerRef = useRef(handler);

  // Update ref when handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (SOCKET_IO_DISABLED) {
      console.log(
        `Socket.IO disabled - skipping subscription for event: ${eventName}`
      );
      return;
    }
    // Create a stable wrapper that calls the latest handler
    const eventHandler = (data: T) => {
      handlerRef.current(data);
    };

    // Subscribe to the event
    socketService.on(eventName, eventHandler);

    console.log(`Subscribed to socket event: ${eventName}`);

    // Cleanup: unsubscribe on unmount or when dependencies change
    return () => {
      socketService.off(eventName, eventHandler);
      console.log(`Unsubscribed from socket event: ${eventName}`);
    };
  }, [eventName, ...dependencies]); // Re-subscribe when event name or dependencies change
}

/**
 * Hook for subscribing to multiple socket events at once
 *
 * @param events - Object mapping event names to handlers
 * @param dependencies - Array of dependencies that trigger re-subscription
 *
 * @example
 * ```tsx
 * function DashboardComponent() {
 *   useSocketEvents({
 *     'group:updated': (group) => updateGroup(group),
 *     'message:new': (message) => addMessage(message),
 *     'news:updated': (news) => updateNews(news),
 *   }, []);
 * }
 * ```
 */
export function useSocketEvents(
  events: Record<string, (data: any) => void>,
  dependencies: any[] = []
): void {
  const eventsRef = useRef(events);

  // Update ref when events change
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    if (SOCKET_IO_DISABLED) {
      console.log("Socket.IO disabled - skipping multi-event subscriptions");
      return;
    }
    // Create stable wrappers for all event handlers
    const eventHandlers: Array<[string, (data: any) => void]> = [];

    Object.entries(eventsRef.current).forEach(([eventName, handler]) => {
      const eventHandler = (data: any) => {
        eventsRef.current[eventName]?.(data);
      };

      socketService.on(eventName, eventHandler);
      eventHandlers.push([eventName, eventHandler]);
      console.log(`Subscribed to socket event: ${eventName}`);
    });

    // Cleanup: unsubscribe all events
    return () => {
      eventHandlers.forEach(([eventName, handler]) => {
        socketService.off(eventName, handler);
        console.log(`Unsubscribed from socket event: ${eventName}`);
      });
    };
  }, [...dependencies]); // Re-subscribe when dependencies change
}

/**
 * Hook for conditionally subscribing to a socket event
 * Only subscribes when the condition is true
 *
 * @param eventName - The socket event name to listen to
 * @param handler - The callback function to handle the event
 * @param condition - Boolean condition that determines if subscription is active
 * @param dependencies - Array of dependencies that trigger re-subscription
 *
 * @example
 * ```tsx
 * function ChatComponent({ groupId, isActive }) {
 *   useConditionalSocketEvent(
 *     'message:new',
 *     (message) => handleMessage(message),
 *     isActive && !!groupId, // Only subscribe when active and groupId exists
 *     [groupId]
 *   );
 * }
 * ```
 */
export function useConditionalSocketEvent<T = any>(
  eventName: string,
  handler: (data: T) => void,
  condition: boolean,
  dependencies: any[] = []
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (SOCKET_IO_DISABLED) {
      console.log(
        `Socket.IO disabled - skipping conditional subscription for event: ${eventName}`
      );
      return;
    }
    if (!condition) {
      return; // Don't subscribe if condition is false
    }

    const eventHandler = (data: T) => {
      handlerRef.current(data);
    };

    socketService.on(eventName, eventHandler);
    console.log(`Conditionally subscribed to socket event: ${eventName}`);

    return () => {
      socketService.off(eventName, eventHandler);
      console.log(`Conditionally unsubscribed from socket event: ${eventName}`);
    };
  }, [eventName, condition, ...dependencies]);
}
