// src/services/typeTransformers.ts
// Type transformation utilities for backend compatibility

import type { User, CognitiveLevel } from "../../types";

/**
 * Transform User object to firebaseUid string
 * Backend expects firebaseUid strings, not full User objects
 */
export function userToFirebaseUid(user: User): string {
  // Prefer actual firebaseUid if available
  if (user.firebaseUid) return user.firebaseUid;
  // Fallback to email as identifier (backend resolutions support this)
  return user.email;
}

/**
 * Transform User array to firebaseUid array
 * Backend expects array of firebaseUid strings for group members
 */
export function usersToFirebaseUids(users: User[]): string[] {
  return users.map((user) => userToFirebaseUid(user));
}

/**
 * Transform CognitiveLevel string to numeric level
 * Backend stores levels as numbers: 1 (أساسي), 2 (متوسط), 3 (متقدم)
 */
export function cognitiveToNumeric(
  level: CognitiveLevel | number | null | undefined
): number {
  if (level === null || level === undefined) return 0;
  if (typeof level === "number") return level;

  switch (level) {
    case "أساسي":
      return 1;
    case "متوسط":
      return 2;
    case "متقدم":
      return 3;
    default:
      return 0;
  }
}

/**
 * Transform activityId from number to string
 * Backend expects activityId as string in some endpoints
 */
export function activityIdToString(id: number): string {
  return String(id);
}

/**
 * Transform numeric level back to CognitiveLevel string
 * Useful for displaying backend data in the UI
 */
export function numericToCognitive(level: number): CognitiveLevel {
  switch (level) {
    case 1:
      return "أساسي";
    case 2:
      return "متوسط";
    case 3:
      return "متقدم";
    default:
      return "أساسي";
  }
}
