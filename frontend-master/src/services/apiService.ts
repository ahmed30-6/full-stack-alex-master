// src/services/apiService.ts

import app, { auth } from "../firebase";
import {
  getStorage,
  ref as storageRef,
  getDownloadURL,
} from "firebase/storage";
import { usersToFirebaseUids, cognitiveToNumeric } from "./typeTransformers";
import type { User, Group, CognitiveLevel } from "../../types";

// Initialize local instances tied to the firebase app
const storage = getStorage(app);

// Local Unsubscribe type (we're using backend polling, not Firestore onSnapshot)
type Unsubscribe = () => void;

// Access Vite env safely in TS by casting import.meta to any
// API base — prefer `VITE_API_BASE` from environment, fall back to localhost:5001
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ||
  "http://localhost:5001/api";


export interface HealthResponse {
  status: string;
  message: string;
  database: any;
}

export interface UserData {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

export interface Activity {
  id?: string;
  userEmail: string;
  userName: string;
  action: string;
  description: string;
  timestamp: Date;
  groupId?: string;
  moduleId?: number;
}

class ApiService {
  // التحقق من حالة الباك اند (بدون auth)
  async checkHealth(): Promise<HealthResponse> {
    const response = await fetch(API_BASE + "/health");

    if (!response.ok) {
      throw new Error("HTTP error! status: " + response.status);
    }

    return await response.json();
  }

  // إرسال بيانات مستخدم (مع auth) - يستخدم الـ endpoint /users على السيرفر
  async addUser(userData: UserData): Promise<any> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(API_BASE + "/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error("HTTP error! status: " + response.status);
    }

    return await response.json();
  }

  // Get user profile from Firestore (retrieves saved name)
  async getUserProfile(email: string): Promise<any> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(API_BASE + "/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error("HTTP error! status: " + response.status);
    }

    return await response.json();
  }

  // ✅ حذفت أو أوقفت دالة getUsers() لأنها تطلب endpoint /users الغير موجود في السيرفر
  // async getUsers(): Promise<any> { ... }

  // إرسال بيانات عامة (مع auth)
  async sendData(data: any): Promise<any> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(API_BASE + "/addData", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("HTTP error! status: " + response.status);
    }

    return await response.json();
  }

  // Record a login event (name, email, optional userAgent)
  async recordLogin(payload: {
    name: string;
    email: string;
    userAgent?: string;
  }): Promise<any> {
    try {
      // try to use auth token if available but allow unauthenticated calls too
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = "Bearer " + token;

      const response = await fetch(API_BASE + "/loginEvent", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok)
        throw new Error("HTTP error! status: " + response.status);
      return await response.json();
    } catch (err) {
      console.error("Failed to record login event", err);
      // Don't throw to avoid breaking login flow — caller can handle
      return null;
    }
  }

  // Fetch recent login events (for admin)
  async getLoginEvents(): Promise<any[]> {
    // Attach auth token so backend can verify admin identity
    const token = await auth.currentUser?.getIdToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = "Bearer " + token;

    const response = await fetch(API_BASE + "/loginEvents", { headers });
    if (!response.ok) throw new Error("HTTP error! status: " + response.status);
    const json = await response.json();
    return json.events || [];
  }

  // Fetch list of users (admin-only)
  async getUsers(): Promise<any[]> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(API_BASE + "/users", {
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (!response.ok) throw new Error("HTTP error! status: " + response.status);
    const json = await response.json();
    return json.users || [];
  }

  // Save all app data to MongoDB
  async saveAppData(data: any): Promise<any> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(API_BASE + "/appdata", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error("HTTP error! status: " + response.status);
    return await response.json();
  }

  // Get all app data from MongoDB
  async loadAppData(): Promise<any> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(API_BASE + "/appdata", {
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (!response.ok) throw new Error("HTTP error! status: " + response.status);
    return await response.json();
  }

  // Admin: Get all users' appdata from MongoDB
  async getAllAppData(): Promise<any> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(API_BASE + "/appdata/all", {
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (!response.ok) throw new Error("HTTP error! status: " + response.status);
    return await response.json();
  }

  // ============ Firestore Real-Time Functions ============

  /**
   * Watch all registered students in real-time (admin-only)
   * Filters by students collection with active status
   *
   * Note: Polling removed. Real-time updates will be handled via Socket.io.
   * This function now only performs an initial fetch.
   */
  watchStudents(callback: (students: any[]) => void): Unsubscribe {
    // Perform initial fetch only
    const fetchAndEmit = async () => {
      try {
        const students = await this.getUsers();
        // Resolve avatars via storage where necessary
        const resolved = await Promise.all(
          (students || []).map(async (s: any) => {
            const student = { ...s };
            if (
              student.avatar &&
              typeof student.avatar === "string" &&
              !student.avatar.startsWith("http")
            ) {
              try {
                student.avatar = await this.getStorageUrl(student.avatar);
              } catch (e) {
                // leave as-is
              }
            }
            return student;
          })
        );
        callback(resolved);
      } catch (err) {
        console.error("Error fetching students from backend:", err);
        callback([]);
      }
    };

    // Initial fetch only - no polling
    fetchAndEmit();

    // Return no-op unsubscribe function for compatibility
    const unsubscribe: Unsubscribe = () => {
      // No-op: real-time updates handled by Socket.io
    };
    return unsubscribe;
  }

  /**
   * Watch all activities in real-time (admin-only)
   * Orders by timestamp descending
   *
   * Note: Polling removed. Backend endpoint /api/activities does not exist.
   * This function now returns empty array immediately.
   * Real-time activity updates will be handled via Socket.io if needed.
   */
  watchActivities(callback: (activities: Activity[]) => void): Unsubscribe {
    // Backend endpoint doesn't exist, return empty array immediately
    callback([]);

    // Return no-op unsubscribe function for compatibility
    const unsubscribe: Unsubscribe = () => {
      // No-op: real-time updates handled by Socket.io if needed
    };
    return unsubscribe;
  }

  /**
   * Watch all groups in real-time (admin-only)
   * Orders by createdAt descending
   *
   * Note: Polling removed. Real-time updates will be handled via Socket.io.
   * This function now only performs an initial fetch.
   */
  watchGroups(callback: (groups: Group[]) => void): Unsubscribe {
    // Perform initial fetch only
    const fetchAndEmit = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = "Bearer " + token;
        const resp = await fetch(API_BASE + "/groups", { headers });
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        const json = await resp.json();
        callback(json.groups || []);
      } catch (err) {
        console.error("Error fetching groups from backend:", err);
        callback([]);
      }
    };

    // Initial fetch only - no polling
    fetchAndEmit();

    // Return no-op unsubscribe function for compatibility
    const unsubscribe: Unsubscribe = () => {
      // No-op: real-time updates handled by Socket.io
    };
    return unsubscribe;
  }

  /**
   * Save a new activity to MongoDB (user-facing, authenticated)
   *
   * DEPRECATED: Backend endpoint /api/activities POST does not exist
   * Activity recording is now handled via /api/appdata
   */
  // async recordActivity(payload: {
  //   action: string;
  //   description: string;
  //   moduleId?: number;
  //   score?: any;
  // }): Promise<any> {
  //   const token = await auth.currentUser?.getIdToken();
  //   if (!token) throw new Error("User not authenticated");

  //   const response = await fetch(API_BASE + "/activities", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Authorization: "Bearer " + token,
  //     },
  //     body: JSON.stringify(payload),
  //   });

  //   if (!response.ok) throw new Error("HTTP error! status: " + response.status);
  //   return await response.json();
  // }


  /**
   * Record an activity to Firestore (called by frontend when significant events occur)
   */
  // DEPRECATED: use recordActivity() above instead
  // This method is kept for reference but the new version handles MongoDB directly

  // Get the currently signed-in Firebase user (or null)
  getCurrentUser() {
    return auth.currentUser || null;
  }

  // Resolve a Cloud Storage path or return the given URL if already an http(s) URL
  async getStorageUrl(pathOrUrl: string): Promise<string> {
    if (!pathOrUrl) return "";
    if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://"))
      return pathOrUrl;

    try {
      const ref = storageRef(storage, pathOrUrl);
      const url = await getDownloadURL(ref);
      return url;
    } catch (err) {
      // Try fallback: if path looks like a gs:// URL
      if (pathOrUrl.startsWith("gs://")) {
        try {
          const trimmed = pathOrUrl.replace("gs://", "");
          const ref2 = storageRef(storage, trimmed);
          return await getDownloadURL(ref2);
        } catch (e) {
          throw e;
        }
      }
      throw err;
    }
  }

  /**
   * Watch students by email (for single student view)
   *
   * Note: Polling removed. Real-time updates will be handled via Socket.io.
   * This function now only performs an initial fetch.
   */
  watchStudentByEmail(
    email: string,
    callback: (student: any | null) => void
  ): Unsubscribe {
    // Perform initial fetch only
    const fetchAndEmit = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          callback(null);
          return;
        }
        const resp = await fetch(API_BASE + "/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({ email }),
        });
        if (!resp.ok) {
          callback(null);
          return;
        }
        const json = await resp.json();
        callback(json.student || null);
      } catch (err) {
        console.error("Error fetching student profile:", err);
        callback(null);
      }
    };

    // Initial fetch only - no polling
    fetchAndEmit();

    // Return no-op unsubscribe function for compatibility
    const unsubscribe: Unsubscribe = () => {
      // No-op: real-time updates handled by Socket.io
    };
    return unsubscribe;
  }

  /**
   * DEPRECATED: Backend endpoint /api/submissions POST does not exist
   * File uploads should use syncActivityFile() from syncService instead
   */
  // async uploadFile(fileData: {
  //   name: string;
  //   type: string;
  //   data: string; // base64
  //   moduleId?: number;
  //   activityId?: number;
  // }): Promise<any> {
  //   const token = await auth.currentUser?.getIdToken();
  //   if (!token) throw new Error("User not authenticated");

  //   const response = await fetch(API_BASE + "/submissions", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Authorization: "Bearer " + token,
  //     },
  //     body: JSON.stringify(fileData),
  //   });

  //   if (!response.ok) throw new Error("HTTP error! status: " + response.status);
  //   return await response.json();
  // }

  /**
   * Get submissions (Admin gets all, User gets own)
   */
  async getMySubmissions(): Promise<any[]> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(API_BASE + "/submissions", {
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (!response.ok) throw new Error("HTTP error! status: " + response.status);
    const json = await response.json();
    return json.submissions || [];
  }

  /**
   * Get submissions for a specific user (Admin only)
   */
  async getUserSubmissions(userId: string): Promise<any[]> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(API_BASE + `/submissions?userId=${userId}`, {
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (!response.ok) throw new Error("HTTP error! status: " + response.status);
    const json = await response.json();
    return json.submissions || [];
  }

  /**
   * DEPRECATED: Backend endpoint /api/files/:fileId does not exist
   */
  // async downloadFile(fileId: string): Promise<Blob> {
  //   const token = await auth.currentUser?.getIdToken();
  //   if (!token) throw new Error("User not authenticated");

  //   const response = await fetch(`${API_BASE}/files/${fileId}`, {
  //     headers: {
  //       Authorization: "Bearer " + token,
  //     },
  //   });

  //   if (!response.ok) throw new Error("HTTP error! status: " + response.status);
  //   return await response.blob();
  // }

  /**
   * DEPRECATED: Backend endpoint /api/groups/:groupId does not exist
   * Groups are fetched via /api/groups GET (all groups)
   */
  // async getGroupById(groupId: string): Promise<any> {
  //   const token = await auth.currentUser?.getIdToken();
  //   if (!token) throw new Error("User not authenticated");

  //   const response = await fetch(`${API_BASE}/groups/${groupId}`, {
  //     headers: {
  //       Authorization: "Bearer " + token,
  //     },
  //   });

  //   if (!response.ok) throw new Error("HTTP error! status: " + response.status);
  //   const json = await response.json();
  //   return json.group;
  // }

  /**
   * Get activity files (for admin dashboard)
   * Fetches all uploaded activity files from backend
   */
  async getActivityFiles(): Promise<any[]> {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("User not authenticated");

      const response = await fetch(`${API_BASE}/activity/file`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn("Failed to fetch activity files:", response.status);
        return [];
      }

      const json = await response.json();
      return json.files || [];
    } catch (err) {
      console.error("Error fetching activity files:", err);
      return [];
    }
  }

  /**
   * Get user's own group
   * Fetches the single group where the current user is a member
   */
  async getMyGroup(): Promise<Group | null> {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("User not authenticated");

      const response = await fetch(`${API_BASE}/groups/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Treat 404 and 400 as "no group" rather than errors
      // This handles cases where user has no group assignment gracefully
      if (response.status === 404 || response.status === 400) {
        return null;
      }

      if (!response.ok) {
        console.warn("Failed to fetch user group:", response.status);
        return null;
      }

      const json = await response.json();
      return json.group || null;
    } catch (err) {
      console.error("Error fetching user group:", err);
      return null;
    }
  }

  /**
   * Get a specific group by ID
   */
  async getGroupById(groupId: string): Promise<Group | null> {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("User not authenticated");

      const response = await fetch(`${API_BASE}/groups/${groupId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn(`Failed to fetch group ${groupId}:`, response.status);
        return null;
      }

      const json = await response.json();
      return json.group || null;
    } catch (err) {
      console.error(`Error fetching group ${groupId}:`, err);
      return null;
    }
  }

  /**
   * Create a new group (Admin only)
   * TASK 7: name is optional - backend generates it if not provided
   */
  async createGroup(groupData: { name?: string; level?: string; members?: string[] }): Promise<Group> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(`${API_BASE}/groups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(groupData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create group");
    }

    const json = await response.json();
    return json.group;
  }

  /**
   * Assign a user to a group (Admin only)
   */
  async assignUserToGroup(groupId: string, userId: string): Promise<any> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(`${API_BASE}/groups/${groupId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to assign user to group");
    }

    return await response.json();
  }

  /**
   * Join a group (Student - token-based, no userId needed)
   * TASK 3: New method for student self-join
   */
  async joinGroup(groupId: string): Promise<any> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(`${API_BASE}/groups/${groupId}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to join group");
    }

    return await response.json();
  }

  /**
   * Remove a user from a group (Admin only)
   */
  async removeUserFromGroup(groupId: string, userId: string): Promise<any> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(`${API_BASE}/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to remove user from group");
    }

    return await response.json();
  }

  // Submit exam result
  async submitExam(data: {
    examId: string | number;
    examType: "pre" | "post";
    score: number;
    total: number;
    // include other fields if needed, like timeTaken etc but backend schema focuses on score
  }): Promise<any> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(API_BASE + "/exams/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error("HTTP error! status: " + response.status);
    return await response.json();
  }

  // Get exam results for logged-in user
  async getMyExamResults(): Promise<any> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(API_BASE + "/exams/my", {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (!response.ok) {
      throw new Error("HTTP error! status: " + response.status);
    }

    return await response.json();
  }

  // Get module content (backend-driven, filtered by user's learning path)
  async getModuleContent(moduleId: number): Promise<any> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(API_BASE + `/content/${moduleId}`, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (!response.ok) {
      throw new Error("HTTP error! status: " + response.status);
    }

    return await response.json();
  }

  // Get all exam results (admin)
  async getAllExamResults(): Promise<any> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(API_BASE + "/exams/all", {
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (!response.ok) throw new Error("HTTP error! status: " + response.status);
    const json = await response.json();
    return json.results || [];
  }
  // Get activity messages
  async getActivityMessages(activityId: number): Promise<any> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(`${API_BASE}/activity/${activityId}/messages`, {
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (!response.ok) throw new Error("HTTP error! status: " + response.status);
    const json = await response.json();
    return json.messages || [];
  }

  // Post activity message
  async postActivityMessage(activityId: number, text: string): Promise<any> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(`${API_BASE}/activity/${activityId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) throw new Error("HTTP error! status: " + response.status);
    return await response.json();
  }
}

export const apiService = new ApiService();
