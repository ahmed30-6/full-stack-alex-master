/**
 * State Persistence Service
 * 
 * Centralized layer for managing state persistence across localStorage and MongoDB.
 * Enforces clear ownership boundaries and deterministic load order.
 * 
 * 🔐 RULES:
 * - Backend-owned state: NEVER persist to localStorage
 * - UI-owned state: NEVER send to backend
 * - Backend ALWAYS wins conflicts
 * - No silent failures
 * 
 * Phase 1 & 1.1: UNTOUCHED (no group/role/permission logic here)
 */

// ============================================
// STATE OWNERSHIP MAP
// ============================================

/**
 * Backend-Owned State (MongoDB via /api/appdata)
 * - Source of Truth: MongoDB
 * - Persistence: Backend only
 * - Load Priority: Backend FIRST, overrides everything
 */
export interface BackendOwnedState {
    moduleScores: {
        [email: string]: {
            [moduleId: number]: {
                preTestScore: number | null;
                postTestScore: number | null;
                preTestTime: number | null;
                postTestTime: number | null;
            };
        };
    };
    completedLessons: { [moduleId: number]: number[] };
    finalQuizPassed: boolean;
    unlockedModules: number[];
    learningPathTopic: string | null;
    currentModuleId: number | null;
    newsItems: any[]; // Shared global state
}

/**
 * UI-Owned State (localStorage only)
 * - Source of Truth: Browser localStorage
 * - Persistence: Frontend only
 * - NOT sent to backend
 */
export interface UIOnlyState {
    moduleLessonIndex: number;
    modulePageIndex: number;
    currentActivityId: number | null;
    // Navigation state only - ephemeral, not critical
}

// ============================================
// PERSISTENCE LAYER
// ============================================

const STORAGE_KEYS = {
    UI_STATE: 'ui_navigation_state',
    NEWS_ITEMS: 'news_items',
} as const;

/**
 * Save UI-only state to localStorage
 * ❌ NEVER call this for backend-owned state
 */
export function saveUIState(state: UIOnlyState): void {
    try {
        localStorage.setItem(STORAGE_KEYS.UI_STATE, JSON.stringify(state));
    } catch (err) {
        console.error('Failed to save UI state to localStorage:', err);
        // Non-critical - UI state can be reset
    }
}

/**
 * Load UI-only state from localStorage
 * Returns defaults if not found
 */
export function loadUIState(): UIOnlyState {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.UI_STATE);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (err) {
        console.error('Failed to load UI state from localStorage:', err);
    }

    // Default UI state
    return {
        moduleLessonIndex: 0,
        modulePageIndex: 0,
        currentActivityId: null,
    };
}

/**
 * Save news items to localStorage (shared global state)
 */
export function saveNewsItems(newsItems: any[]): void {
    try {
        localStorage.setItem(STORAGE_KEYS.NEWS_ITEMS, JSON.stringify(newsItems));
    } catch (err) {
        console.error('Failed to save news items:', err);
    }
}

/**
 * Load news items from localStorage
 */
export function loadNewsItems(): any[] | null {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.NEWS_ITEMS);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (err) {
        console.error('Failed to load news items:', err);
    }
    return null;
}

/**
 * Clear UI state on logout
 */
export function clearUIState(): void {
    try {
        localStorage.removeItem(STORAGE_KEYS.UI_STATE);
    } catch (err) {
        console.error('Failed to clear UI state:', err);
    }
}

/**
 * DEPRECATED: Remove old localStorage keys from Phase 1
 * This ensures clean migration
 */
export function migrateOldStorage(userEmail: string): void {
    try {
        const oldKey = `progress_${userEmail}`;
        const oldData = localStorage.getItem(oldKey);

        if (oldData) {
            if (process.env.NODE_ENV === 'development') {
                console.log(`Removing deprecated localStorage key: ${oldKey}`);
            }
            localStorage.removeItem(oldKey);
        }
    } catch (err) {
        console.error('Failed to migrate old storage:', err);
    }
}

// ============================================
// CONFLICT RESOLUTION
// ============================================

/**
 * Resolve conflicts between backend and localStorage
 * 
 * RULE: Backend ALWAYS wins
 * 
 * @param backendState - State from MongoDB
 * @param localState - State from localStorage (if any)
 * @returns Resolved state (backend wins)
 */
export function resolveStateConflict<T>(
    backendState: T | null,
    localState: T | null
): T | null {
    // Backend wins - no questions asked
    if (backendState !== null && backendState !== undefined) {
        if (localState !== null && process.env.NODE_ENV === 'development') {
            console.log('Conflict resolved: Backend state overrides localStorage');
        }
        return backendState;
    }

    // Fallback to local only if backend has nothing
    return localState;
}

/**
 * Deterministic state hydration
 * 
 * Load Order:
 * 1. Backend state (via API)
 * 2. UI state (from localStorage)
 * 3. Backend ALWAYS overrides
 * 
 * @param backendData - Data from /api/appdata
 * @returns Hydrated state with clear ownership
 */
export function hydrateState(backendData: Partial<BackendOwnedState>) {
    // Step 1: Load backend-owned state (PRIORITY)
    const backendState = {
        moduleScores: backendData.moduleScores || {},
        completedLessons: backendData.completedLessons || {},
        finalQuizPassed: backendData.finalQuizPassed || false,
        unlockedModules: backendData.unlockedModules || [1],
        learningPathTopic: backendData.learningPathTopic || null,
        currentModuleId: backendData.currentModuleId || null,
    };

    // Step 2: Load UI-only state (SECONDARY)
    const uiState = loadUIState();

    // Step 3: Return separated states
    return {
        backend: backendState,
        ui: uiState,
    };
}

/**
 * Validate that backend save succeeded before updating local state
 * 
 * @param savePromise - Promise from apiService.saveAppData()
 * @param onSuccess - Callback to update local state ONLY if backend succeeds
 * @param onFailure - Callback if backend fails
 */
export async function ensureBackendPersistence<T>(
    savePromise: Promise<T>,
    onSuccess: () => void,
    onFailure?: (error: any) => void
): Promise<void> {
    try {
        await savePromise;
        // Backend succeeded - safe to update local state
        onSuccess();

        if (process.env.NODE_ENV === 'development') {
            console.log('✅ Backend persistence confirmed');
        }
    } catch (err) {
        console.error('❌ Backend persistence FAILED:', err);

        // DO NOT update local state if backend failed
        if (onFailure) {
            onFailure(err);
        } else {
            // Default: Alert user (critical data loss prevention)
            alert('فشل حفظ البيانات. يرجى المحاولة مرة أخرى.');
        }
    }
}
