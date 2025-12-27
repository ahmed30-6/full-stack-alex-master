/**
 * Permission Matrix - Single Source of Truth
 * 
 * Defines all authorization rules for the educational platform.
 * This is the ONLY place where permission logic should be defined.
 * 
 * 🔐 RULES:
 * - Admin: Can access any group, any action
 * - Student: Can only access their own group
 * - Student without group: No access to group features
 * - NO array searching
 * - NO implicit logic
 * - ALL rules explicit
 * 
 * Phase 1, 1.1, 2: UNTOUCHED (no changes to existing logic)
 */

import type { User } from '../../types';

// ============================================
// PERMISSION ACTIONS
// ============================================

export enum PermissionAction {
    // Group Actions
    VIEW_GROUP = 'VIEW_GROUP',
    ENTER_GROUP = 'ENTER_GROUP',
    CREATE_GROUP = 'CREATE_GROUP',
    REMOVE_USER = 'REMOVE_USER',

    // Communication Actions
    CHAT = 'CHAT',
    UPLOAD_FILE = 'UPLOAD_FILE',
    SEND_ACTIVITY = 'SEND_ACTIVITY',

    // Content Actions
    VIEW_CONTENT = 'VIEW_CONTENT',
    VIEW_PDF = 'VIEW_PDF',

    // Admin Actions
    VIEW_ALL_STUDENTS = 'VIEW_ALL_STUDENTS',
    VIEW_ALL_GROUPS = 'VIEW_ALL_GROUPS',
}

// ============================================
// PERMISSION CONTEXT
// ============================================

export interface PermissionContext {
    targetGroupId?: string | null;
    moduleId?: number | null;
    activityId?: number | null;
    adminEnteredGroupId?: string | null;
}

// ============================================
// PERMISSION RULES (EXPLICIT)
// ============================================

/**
 * Check if user can perform an action
 * 
 * @param user - Current user
 * @param action - Action to check
 * @param context - Context for the action
 * @returns true if allowed, false otherwise
 */
export function canPerformAction(
    user: User | null,
    action: PermissionAction,
    context: PermissionContext = {}
): boolean {
    if (!user) return false;

    const isAdmin = user.role === 'admin';
    const { targetGroupId, adminEnteredGroupId } = context;

    // ============================================
    // ADMIN PERMISSIONS
    // ============================================
    if (isAdmin) {
        switch (action) {
            // Admin can always create groups and manage users
            case PermissionAction.CREATE_GROUP:
            case PermissionAction.REMOVE_USER:
            case PermissionAction.VIEW_ALL_STUDENTS:
            case PermissionAction.VIEW_ALL_GROUPS:
                return true;

            // Admin can view any group
            case PermissionAction.VIEW_GROUP:
                return true;

            // Admin can enter any group (sets context)
            case PermissionAction.ENTER_GROUP:
                return !!targetGroupId;

            // Admin can chat/upload/send ONLY if they've entered a group
            case PermissionAction.CHAT:
            case PermissionAction.UPLOAD_FILE:
            case PermissionAction.SEND_ACTIVITY:
                return !!adminEnteredGroupId;

            // Admin can view content (no restrictions)
            case PermissionAction.VIEW_CONTENT:
            case PermissionAction.VIEW_PDF:
                return true;

            default:
                return false;
        }
    }

    // ============================================
    // STUDENT PERMISSIONS
    // ============================================

    // Student MUST have a group for most actions
    const hasGroup = !!user.groupId;

    switch (action) {
        // Students CANNOT create groups or remove users
        case PermissionAction.CREATE_GROUP:
        case PermissionAction.REMOVE_USER:
        case PermissionAction.VIEW_ALL_STUDENTS:
        case PermissionAction.VIEW_ALL_GROUPS:
            return false;

        // Student can view ONLY their own group
        case PermissionAction.VIEW_GROUP:
            if (!hasGroup) return false;
            if (!targetGroupId) return false;
            return user.groupId === targetGroupId;

        // Student cannot "enter" groups (they belong to one)
        case PermissionAction.ENTER_GROUP:
            return false;

        // Student can chat/upload/send ONLY in their own group
        case PermissionAction.CHAT:
        case PermissionAction.UPLOAD_FILE:
        case PermissionAction.SEND_ACTIVITY:
            if (!hasGroup) return false;
            // If targetGroupId specified, must match user's group
            if (targetGroupId) {
                return user.groupId === targetGroupId;
            }
            return true;

        // Student can view content ONLY if they have a group
        // (Backend will enforce level matching)
        case PermissionAction.VIEW_CONTENT:
        case PermissionAction.VIEW_PDF:
            return hasGroup;

        default:
            return false;
    }
}

/**
 * Get reason why action is blocked
 * 
 * @param user - Current user
 * @param action - Action that was blocked
 * @param context - Context for the action
 * @returns User-facing reason in Arabic
 */
export function getBlockedReason(
    user: User | null,
    action: PermissionAction,
    context: PermissionContext = {}
): string {
    if (!user) {
        return 'يجب تسجيل الدخول أولاً';
    }

    const isAdmin = user.role === 'admin';
    const hasGroup = !!user.groupId;
    const { adminEnteredGroupId } = context;

    // ============================================
    // ADMIN BLOCKED REASONS
    // ============================================
    if (isAdmin) {
        switch (action) {
            case PermissionAction.CHAT:
            case PermissionAction.UPLOAD_FILE:
            case PermissionAction.SEND_ACTIVITY:
                if (!adminEnteredGroupId) {
                    return 'يرجى اختيار مجموعة أولاً من صفحة المجموعات';
                }
                return 'غير مسموح بهذا الإجراء';

            case PermissionAction.ENTER_GROUP:
                return 'يرجى تحديد مجموعة صحيحة';

            default:
                return 'غير مسموح بهذا الإجراء';
        }
    }

    // ============================================
    // STUDENT BLOCKED REASONS
    // ============================================

    switch (action) {
        case PermissionAction.CREATE_GROUP:
        case PermissionAction.REMOVE_USER:
        case PermissionAction.VIEW_ALL_STUDENTS:
        case PermissionAction.VIEW_ALL_GROUPS:
            return 'هذا الإجراء متاح للباحثة فقط';

        case PermissionAction.VIEW_GROUP:
        case PermissionAction.CHAT:
        case PermissionAction.UPLOAD_FILE:
        case PermissionAction.SEND_ACTIVITY:
        case PermissionAction.VIEW_CONTENT:
        case PermissionAction.VIEW_PDF:
            if (!hasGroup) {
                return 'يجب الانضمام إلى مجموعة للوصول لهذا المحتوى';
            }
            return 'غير مسموح بالوصول لهذا المحتوى';

        case PermissionAction.ENTER_GROUP:
            return 'أنت بالفعل عضو في مجموعة';

        default:
            return 'غير مسموح بهذا الإجراء';
    }
}

/**
 * Get suggested action for blocked user
 * 
 * @param user - Current user
 * @param action - Action that was blocked
 * @returns Suggested action in Arabic
 */
export function getSuggestedAction(
    user: User | null,
    action: PermissionAction
): string | null {
    if (!user) {
        return 'قم بتسجيل الدخول';
    }

    const isAdmin = user.role === 'admin';
    const hasGroup = !!user.groupId;

    if (isAdmin) {
        switch (action) {
            case PermissionAction.CHAT:
            case PermissionAction.UPLOAD_FILE:
            case PermissionAction.SEND_ACTIVITY:
                return 'انتقل إلى صفحة المجموعات واختر مجموعة';
            default:
                return null;
        }
    }

    // Student suggestions
    switch (action) {
        case PermissionAction.VIEW_GROUP:
        case PermissionAction.CHAT:
        case PermissionAction.UPLOAD_FILE:
        case PermissionAction.SEND_ACTIVITY:
        case PermissionAction.VIEW_CONTENT:
        case PermissionAction.VIEW_PDF:
            if (!hasGroup) {
                return 'انتقل إلى صفحة المجموعات وانضم لمجموعة';
            }
            return null;

        default:
            return null;
    }
}
