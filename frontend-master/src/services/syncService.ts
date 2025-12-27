// src/services/syncService.ts
// Sync service to synchronize frontend Firebase data with backend MongoDB

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ||
  "https://backend-adaptive-collearning.up.railway.app/api";

interface SyncUserPayload {
  firebaseUid: string;
  username: string;
  email: string;
  profile?: any;
}

interface SyncLoginTimePayload {
  firebaseUid: string;
}

interface SyncActivityFilePayload {
  activityId: number;
  filename: string;
  url: string;
  uploadedByUid: string;
}

interface SyncScorePayload {
  studentUid: string;
  examId: string;
  score: number;
  maxScore: number;
  groupId?: string;
}

interface SyncActivityMessagePayload {
  activityId: number;
  text: string;
}

/**
 * Sync user data to backend MongoDB after signup
 */
export async function syncUser(
  payload: SyncUserPayload,
  idToken: string
): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/sync/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to sync user:", error);
    throw error;
  }
}

/**
 * Sync login time to backend MongoDB after successful login
 */
export async function syncLoginTime(
  payload: SyncLoginTimePayload,
  idToken: string
): Promise<any> {
  try {
    // Correct endpoint is /api/loginEvent
    // We ignore the passed payload argument as we construct a new one confirming to backend expectations
    const response = await fetch(`${API_BASE}/loginEvent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        action: "user_login",
        description: "User logged in",
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      // Just log warning, do not throw
      console.warn(`Login time sync failed with status: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    // Catch silently to not disrupt login flow
    console.warn("Failed to sync login time (silent catch):", error);
    return null;
  }
}

/**
 * Sync activity file upload to backend MongoDB
 */
export async function syncActivityFile(
  payload: SyncActivityFilePayload,
  idToken: string
): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/sync/activity/file`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to sync activity file:", error);
    throw error;
  }
}

/**
 * DEPRECATED: Scores are saved via /api/appdata moduleScores.
 * This function is kept for compatibility but performs no network calls.
 */
export async function syncScore(
  _payload: SyncScorePayload,
  _idToken: string
): Promise<any> {
  console.warn(
    "syncScore is deprecated. Scores are persisted via /api/appdata moduleScores."
  );
  return { skipped: true };
}

/**
 * Sync activity chat message to backend MongoDB
 */
export async function syncActivityMessage(
  payload: SyncActivityMessagePayload,
  idToken: string
): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/sync/activity/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to sync activity message:", error);
    throw error;
  }
}
