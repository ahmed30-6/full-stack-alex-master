// src/hooks/index.ts

/**
 * Socket.io React hooks
 *
 * Export all socket-related hooks for easy importing
 */

export { useSocket } from "./useSocket";
export {
  useSocketEvent,
  useSocketEvents,
  useConditionalSocketEvent,
} from "./useSocketEvent";
export type { } from "./useSocket";
export {
  useGroupContext,
  canAccessGroup,
  canPerformAction,
} from "./useGroupContext";
