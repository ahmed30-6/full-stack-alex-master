/**
 * Authorization Module - Exports
 * 
 * Centralized authorization for the educational platform.
 * Import from this file to access permissions and guards.
 */

// Permission matrix
export {
    PermissionAction,
    type PermissionContext,
    canPerformAction,
    getBlockedReason,
    getSuggestedAction,
} from './permissions';

// Guards
export {
    type GuardResult,
    canAccessGroup,
    canChat,
    canUploadFile,
    canSendActivity,
    canViewContent,
    canEnterGroup,
    canCreateGroup,
    canRemoveUser,
    assertCanPerform,
    showBlockedMessage,
    checkPermission,
} from './guards';
