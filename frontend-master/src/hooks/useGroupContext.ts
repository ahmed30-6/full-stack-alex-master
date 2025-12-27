/**
 * useGroupContext Hook
 * 
 * Centralized group context resolution based on user role.
 * This is the SINGLE SOURCE OF TRUTH for determining current group context.
 * 
 * Rules:
 * - Students: Use user.groupId (from backend User document)
 * - Admins: Use enteredGroupId (from UI context/navigation)
 * 
 * ❌ NO array searching
 * ❌ NO fallback logic
 * ❌ NO inference
 */

import { useMemo } from 'react';
import type { User } from '../../types';

interface GroupContextResult {
    currentGroupId: string | null;
    hasGroupAccess: boolean;
    isAdmin: boolean;
}

/**
 * Get current group context based on user role
 * 
 * @param user - Current user object
 * @param enteredGroupId - Optional group ID for admin context (when admin "enters" a group)
 * @returns Group context with currentGroupId and access flags
 */
export function useGroupContext(
    user: User | null,
    enteredGroupId?: string | null
): GroupContextResult {
    return useMemo(() => {
        if (!user) {
            return {
                currentGroupId: null,
                hasGroupAccess: false,
                isAdmin: false,
            };
        }

        const isAdmin = user.role === 'admin';

        // Admin: Use entered group context (temporary UI state)
        if (isAdmin) {
            return {
                currentGroupId: enteredGroupId || null,
                hasGroupAccess: !!enteredGroupId, // Admin has access if they've entered a group
                isAdmin: true,
            };
        }

        // Student: Use user.groupId (from backend)
        return {
            currentGroupId: user.groupId || null,
            hasGroupAccess: !!user.groupId, // Student has access if they have a group
            isAdmin: false,
        };
    }, [user, enteredGroupId]);
}

/**
 * Check if user can perform an action in a specific group
 * 
 * @param user - Current user object
 * @param targetGroupId - Group ID to check access for
 * @param enteredGroupId - Optional admin context group ID
 * @returns true if user can access the group
 */
export function canAccessGroup(
    user: User | null,
    targetGroupId: string | null,
    enteredGroupId?: string | null
): boolean {
    if (!user || !targetGroupId) return false;

    const isAdmin = user.role === 'admin';

    // Admin can access any group (if they've entered it)
    if (isAdmin) {
        return enteredGroupId === targetGroupId;
    }

    // Student can only access their own group
    return user.groupId === targetGroupId;
}

/**
 * Check if user can perform a specific action
 * 
 * @param user - Current user object
 * @param action - Action to check ('chat' | 'upload' | 'removeUser' | 'createGroup')
 * @param targetGroupId - Optional group ID for group-specific actions
 * @param enteredGroupId - Optional admin context group ID
 * @returns true if user can perform the action
 */
export function canPerformAction(
    user: User | null,
    action: 'chat' | 'upload' | 'removeUser' | 'createGroup' | 'viewGroup',
    targetGroupId?: string | null,
    enteredGroupId?: string | null
): boolean {
    if (!user) return false;

    const isAdmin = user.role === 'admin';

    // Admin can do everything
    if (isAdmin) {
        // For group-specific actions, admin must have entered the group
        if (action === 'chat' || action === 'upload' || action === 'viewGroup') {
            return targetGroupId ? enteredGroupId === targetGroupId : !!enteredGroupId;
        }
        // Admin-only actions
        if (action === 'removeUser' || action === 'createGroup') {
            return true;
        }
    }

    // Student permissions
    if (action === 'chat' || action === 'upload' || action === 'viewGroup') {
        // Student can only interact with their own group
        return targetGroupId ? user.groupId === targetGroupId : !!user.groupId;
    }

    // Students cannot remove users or create groups
    if (action === 'removeUser' || action === 'createGroup') {
        return false;
    }

    return false;
}
