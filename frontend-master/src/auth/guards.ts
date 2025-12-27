/**
 * Authorization Guards - Centralized Enforcement
 * 
 * Provides guard functions that enforce permissions and provide clear UX feedback.
 * All guards rely on the permission matrix, NOT on inline logic.
 * 
 * 🔐 RULES:
 * - Guards MUST use permissions.ts
 * - Guards MUST NOT inspect arrays
 * - Guards MUST NOT guess membership
 * - Guards MUST provide clear UX messages
 * 
 * Phase 1, 1.1, 2: UNTOUCHED
 */

import type { User } from '../../types';
import {
    PermissionAction,
    type PermissionContext,
    canPerformAction,
    getBlockedReason,
    getSuggestedAction,
} from './permissions';

// ============================================
// GUARD RESULT
// ============================================

export interface GuardResult {
    allowed: boolean;
    reason?: string;
    suggestedAction?: string | null;
}

// ============================================
// CORE GUARDS
// ============================================

/**
 * Check if user can access a specific group
 * 
 * @param user - Current user
 * @param targetGroupId - Group to access
 * @param adminEnteredGroupId - Admin context (if admin)
 * @returns Guard result
 */
export function canAccessGroup(
    user: User | null,
    targetGroupId: string | null,
    adminEnteredGroupId?: string | null
): GuardResult {
    const allowed = canPerformAction(
        user,
        PermissionAction.VIEW_GROUP,
        { targetGroupId, adminEnteredGroupId }
    );

    if (allowed) {
        return { allowed: true };
    }

    return {
        allowed: false,
        reason: getBlockedReason(user, PermissionAction.VIEW_GROUP, { targetGroupId }),
        suggestedAction: getSuggestedAction(user, PermissionAction.VIEW_GROUP),
    };
}

/**
 * Check if user can chat
 * 
 * @param user - Current user
 * @param targetGroupId - Group to chat in (optional)
 * @param adminEnteredGroupId - Admin context (if admin)
 * @returns Guard result
 */
export function canChat(
    user: User | null,
    targetGroupId?: string | null,
    adminEnteredGroupId?: string | null
): GuardResult {
    const allowed = canPerformAction(
        user,
        PermissionAction.CHAT,
        { targetGroupId, adminEnteredGroupId }
    );

    if (allowed) {
        return { allowed: true };
    }

    return {
        allowed: false,
        reason: getBlockedReason(user, PermissionAction.CHAT, { adminEnteredGroupId }),
        suggestedAction: getSuggestedAction(user, PermissionAction.CHAT),
    };
}

/**
 * Check if user can upload files
 * 
 * @param user - Current user
 * @param targetGroupId - Group to upload to (optional)
 * @param adminEnteredGroupId - Admin context (if admin)
 * @returns Guard result
 */
export function canUploadFile(
    user: User | null,
    targetGroupId?: string | null,
    adminEnteredGroupId?: string | null
): GuardResult {
    const allowed = canPerformAction(
        user,
        PermissionAction.UPLOAD_FILE,
        { targetGroupId, adminEnteredGroupId }
    );

    if (allowed) {
        return { allowed: true };
    }

    return {
        allowed: false,
        reason: getBlockedReason(user, PermissionAction.UPLOAD_FILE, { adminEnteredGroupId }),
        suggestedAction: getSuggestedAction(user, PermissionAction.UPLOAD_FILE),
    };
}

/**
 * Check if user can send activity submission
 * 
 * @param user - Current user
 * @param activityId - Activity ID
 * @param adminEnteredGroupId - Admin context (if admin)
 * @returns Guard result
 */
export function canSendActivity(
    user: User | null,
    activityId?: number | null,
    adminEnteredGroupId?: string | null
): GuardResult {
    const allowed = canPerformAction(
        user,
        PermissionAction.SEND_ACTIVITY,
        { activityId, adminEnteredGroupId }
    );

    if (allowed) {
        return { allowed: true };
    }

    return {
        allowed: false,
        reason: getBlockedReason(user, PermissionAction.SEND_ACTIVITY, { adminEnteredGroupId }),
        suggestedAction: getSuggestedAction(user, PermissionAction.SEND_ACTIVITY),
    };
}

/**
 * Check if user can view content
 * 
 * @param user - Current user
 * @param moduleId - Module ID (optional)
 * @returns Guard result
 */
export function canViewContent(
    user: User | null,
    moduleId?: number | null
): GuardResult {
    const allowed = canPerformAction(
        user,
        PermissionAction.VIEW_CONTENT,
        { moduleId }
    );

    if (allowed) {
        return { allowed: true };
    }

    return {
        allowed: false,
        reason: getBlockedReason(user, PermissionAction.VIEW_CONTENT),
        suggestedAction: getSuggestedAction(user, PermissionAction.VIEW_CONTENT),
    };
}

/**
 * Check if user can enter a group (admin only)
 * 
 * @param user - Current user
 * @param targetGroupId - Group to enter
 * @returns Guard result
 */
export function canEnterGroup(
    user: User | null,
    targetGroupId: string | null
): GuardResult {
    const allowed = canPerformAction(
        user,
        PermissionAction.ENTER_GROUP,
        { targetGroupId }
    );

    if (allowed) {
        return { allowed: true };
    }

    return {
        allowed: false,
        reason: getBlockedReason(user, PermissionAction.ENTER_GROUP, { targetGroupId }),
        suggestedAction: getSuggestedAction(user, PermissionAction.ENTER_GROUP),
    };
}

/**
 * Check if user can create groups (admin only)
 * 
 * @param user - Current user
 * @returns Guard result
 */
export function canCreateGroup(user: User | null): GuardResult {
    const allowed = canPerformAction(user, PermissionAction.CREATE_GROUP);

    if (allowed) {
        return { allowed: true };
    }

    return {
        allowed: false,
        reason: getBlockedReason(user, PermissionAction.CREATE_GROUP),
        suggestedAction: null,
    };
}

/**
 * Check if user can remove users from groups (admin only)
 * 
 * @param user - Current user
 * @returns Guard result
 */
export function canRemoveUser(user: User | null): GuardResult {
    const allowed = canPerformAction(user, PermissionAction.REMOVE_USER);

    if (allowed) {
        return { allowed: true };
    }

    return {
        allowed: false,
        reason: getBlockedReason(user, PermissionAction.REMOVE_USER),
        suggestedAction: null,
    };
}

// ============================================
// ASSERTION GUARDS (Throw on failure)
// ============================================

/**
 * Assert that user can perform action, throw if not
 * Use this for critical operations that should never fail silently
 * 
 * @param user - Current user
 * @param action - Action to check
 * @param context - Context for the action
 * @throws Error with user-facing message if not allowed
 */
export function assertCanPerform(
    user: User | null,
    action: PermissionAction,
    context: PermissionContext = {}
): void {
    const allowed = canPerformAction(user, action, context);

    if (!allowed) {
        const reason = getBlockedReason(user, action, context);
        throw new Error(reason);
    }
}

// ============================================
// UX HELPERS
// ============================================

/**
 * Show user-facing message for blocked action
 * 
 * @param guardResult - Result from guard function
 * @param onNavigate - Optional callback to navigate (e.g., to groups page)
 */
export function showBlockedMessage(
    guardResult: GuardResult,
    onNavigate?: () => void
): void {
    if (guardResult.allowed) return;

    let message = guardResult.reason || 'غير مسموح بهذا الإجراء';

    if (guardResult.suggestedAction) {
        message += `\n\n${guardResult.suggestedAction}`;
    }

    alert(message);

    // If navigation callback provided and there's a suggested action, call it
    if (onNavigate && guardResult.suggestedAction) {
        onNavigate();
    }
}

/**
 * Get guard result for quick inline checks
 * 
 * @param user - Current user
 * @param action - Action to check
 * @param context - Context for the action
 * @returns Guard result
 */
export function checkPermission(
    user: User | null,
    action: PermissionAction,
    context: PermissionContext = {}
): GuardResult {
    const allowed = canPerformAction(user, action, context);

    if (allowed) {
        return { allowed: true };
    }

    return {
        allowed: false,
        reason: getBlockedReason(user, action, context),
        suggestedAction: getSuggestedAction(user, action),
    };
}
