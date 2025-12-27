# Frontend Integration Tasks

## Overview

This document provides a sequential, isolated task list for integrating the frontend with the backend. Each task is scoped to specific files and includes clear boundaries of what must change and what must NOT change.

**CRITICAL RULES:**

- ❌ NO UI component changes
- ❌ NO layout or styling changes
- ❌ NO UX flow changes
- ✅ ONLY logic and API integration changes

---

## Task 1: Fix Sync Service Endpoint Paths

**Scope:** Correct endpoint paths in sync service to match backend

**Files to Touch:**

- `frontend-master/src/services/syncService.ts`

**What Changes:**

1. Update `syncScore` function:
   - Change endpoint from `/api/sync/score` to `/api/scores`
2. Update `syncLoginTime` function:
   - Change endpoint from `/api/sync/login` to `/api/sync/login-time`
3. Update `syncActivityMessage` function:
   - Change endpoint from `/api/sync/activity-message` to `/api/sync/activity/message`
4. Update `syncActivityFile` function:
   - Change endpoint from `/api/sync/activity-file` to `/api/sync/activity/file`

**What Must NOT Change:**

- Function signatures
- Parameter types
- Return types
- Error handling patterns
- Any calling code in App.tsx or other components

**Validation:**

- All sync functions should successfully call backend endpoints
- No 404 errors in network tab
- Data should persist to MongoDB

---

## Task 2: Add Type Transformers for Backend Compatibility

**Scope:** Create utility functions to transform frontend types to backend-expected formats

**Files to Touch:**

- `frontend-master/src/services/typeTransformers.ts` (NEW)
- `frontend-master/src/services/apiService.ts` (UPDATE)

**What Changes:**

1. Create new file `typeTransformers.ts` with functions:

   ```typescript
   // Transform User object to firebaseUid string
   export function userToFirebaseUid(user: User): string;

   // Transform User array to firebaseUid array
   export function usersToFirebaseUids(users: User[]): string[];

   // Transform CognitiveLevel to numeric level
   export function cognitiveToNumeric(level: CognitiveLevel): number;

   // Transform activityId from number to string
   export function activityIdToString(id: number): string;
   ```

2. Update `apiService.saveGroup()`:
   - Transform `members` from User[] to string[]
   - Add `type` field ('single' | 'multi') based on members.length
   - Transform `level` from CognitiveLevel to number

**What Must NOT Change:**

- Existing function signatures in apiService
- How components call these functions
- UI rendering logic
- State management in App.tsx

**Validation:**

- Groups should save successfully to backend
- Backend should accept transformed payloads
- No type errors in console

---

## Task 3: Create Socket.io Service

**Scope:** Create Socket.io connection management service

**Files to Touch:**

- `frontend-master/src/services/socketService.ts` (NEW)
- `frontend-master/package.json` (UPDATE - add socket.io-client dependency)

**What Changes:**

1. Install socket.io-client:

   ```bash
   npm install socket.io-client
   ```

2. Create `socketService.ts` with:

   - Socket connection initialization
   - Authentication handling
   - Connection status management
   - Event subscription interface
   - Reconnection logic
   - Error handling

3. Export:

   ```typescript
   export class SocketService {
     connect(): void;
     disconnect(): void;
     authenticate(token: string): Promise<void>;
     on(event: string, handler: Function): void;
     off(event: string, handler: Function): void;
     emit(event: string, data: any): void;
     getConnectionStatus(): ConnectionStatus;
   }

   export const socketService = new SocketService();
   ```

**What Must NOT Change:**

- Any existing API service code
- Any component code
- Any UI rendering

**Validation:**

- Socket connects to backend
- Authentication succeeds
- Connection status tracked correctly
- No errors in console

---

## Task 4: Create React Hooks for Socket.io

**Scope:** Create reusable React hooks for socket functionality

**Files to Touch:**

- `frontend-master/src/hooks/useSocket.ts` (NEW)
- `frontend-master/src/hooks/useSocketEvent.ts` (NEW)

**What Changes:**

1. Create `useSocket.ts`:

   ```typescript
   export function useSocket() {
     // Returns socket instance and connection status
     // Handles initialization and cleanup
     return { socket, connected, authenticated };
   }
   ```

2. Create `useSocketEvent.ts`:
   ```typescript
   export function useSocketEvent(
     eventName: string,
     handler: Function,
     dependencies: any[]
   ) {
     // Subscribes to socket event
     // Automatic cleanup on unmount
     // Re-subscribes when dependencies change
   }
   ```

**What Must NOT Change:**

- Any existing hooks
- Any component logic
- Any UI rendering

**Validation:**

- Hooks work in React components
- Cleanup happens on unmount
- No memory leaks
- TypeScript types correct

---

## Task 5: Replace Polling in apiService

**Scope:** Remove polling intervals from watch functions

**Files to Touch:**

- `frontend-master/src/services/apiService.ts`

**What Changes:**

1. Update `watchStudents()`:

   - Remove `setInterval` call
   - Keep initial REST API fetch
   - Return unsubscribe function (no-op)

2. Update `watchGroups()`:

   - Remove `setInterval` call
   - Keep initial REST API fetch
   - Return unsubscribe function (no-op)

3. Update `watchActivities()`:

   - Remove `setInterval` call
   - Remove REST API fetch (endpoint doesn't exist)
   - Return empty array immediately
   - Return unsubscribe function (no-op)

4. Update `watchStudentByEmail()`:
   - Remove `setInterval` call
   - Keep initial REST API fetch
   - Return unsubscribe function (no-op)

**What Must NOT Change:**

- Function signatures
- Return types (still return Unsubscribe function)
- How components call these functions
- Callback patterns

**Validation:**

- No polling requests in network tab
- Initial data still loads
- Components still work
- No errors in console

---

## Task 6: Add Socket Event Listeners to App.tsx

**Scope:** Add real-time event listeners for groups, messages, and news

**Files to Touch:**

- `frontend-master/App.tsx`

**What Changes:**

1. Import socket hooks at top of file

2. Add socket initialization in App component:

   ```typescript
   const { socket, connected, authenticated } = useSocket();
   ```

3. Add `group:updated` listener:

   ```typescript
   useSocketEvent(
     "group:updated",
     (groupData) => {
       setGroups((prev) => {
         const existing = prev.find((g) => g.id === groupData.id);
         if (existing) {
           return prev.map((g) => (g.id === groupData.id ? groupData : g));
         } else {
           return [...prev, groupData];
         }
       });
     },
     []
   );
   ```

4. Add `message:new` listener:

   ```typescript
   useSocketEvent(
     "message:new",
     (messageData) => {
       setDiscussions((prev) => [...prev, messageData]);
     },
     []
   );
   ```

5. Add `news:updated` listener:
   ```typescript
   useSocketEvent(
     "news:updated",
     (newsData) => {
       setNewsItems((prev) => {
         const existing = prev.find((n) => n.id === newsData.newsId);
         if (existing) {
           return prev.map((n) => (n.id === newsData.newsId ? newsData : n));
         } else {
           return [newsData, ...prev];
         }
       });
     },
     []
   );
   ```

**What Must NOT Change:**

- Any UI components
- Any rendering logic
- Any navigation logic
- Any existing state management patterns
- Component hierarchy

**Validation:**

- Real-time updates work
- State updates correctly
- UI re-renders with new data
- No duplicate messages
- No performance issues

---

## Task 7: Add Group Room Management

**Scope:** Auto-join user's groups and handle room lifecycle

**Files to Touch:**

- `frontend-master/App.tsx`

**What Changes:**

1. Add effect to join groups after authentication:
   ```typescript
   useEffect(() => {
     if (!socket || !authenticated || !user) return;

     // Find user's groups
     const userGroups = groups.filter((g) =>
       g.members.some((m) => m.id === user.id)
     );

     // Join each group room
     userGroups.forEach((group) => {
       socket.emit("join:group", { groupId: group.id });
     });

     return () => {
       // Leave groups on unmount
       userGroups.forEach((group) => {
         socket.emit("leave:group", { groupId: group.id });
       });
     };
   }, [socket, authenticated, user, groups]);
   ```

**What Must NOT Change:**

- Group formation logic
- Group display UI
- Group membership logic
- Any other App.tsx functionality

**Validation:**

- User joins groups automatically
- User receives group messages
- User leaves groups on logout
- No errors in console

---

## Task 8: Add Real-Time Messages to Collaborative Learning

**Scope:** Add message:new listener to chat interface

**Files to Touch:**

- `frontend-master/components/pages/CollaborativeLearningPage.tsx`

**What Changes:**

1. Import socket hook at top

2. Add socket event listener:

   ```typescript
   const { socket } = useSocket();

   useEffect(() => {
     if (!socket || !groupId) return;

     const handleNewMessage = (messageData: any) => {
       if (
         messageData.groupId === groupId &&
         messageData.activityId === activityId
       ) {
         // Message already added via onSendMessage callback
         // This handles messages from OTHER users
         if (messageData.senderUid !== user.id) {
           // Add to local display (parent handles state)
           // Or trigger parent callback if needed
         }
       }
     };

     socket.on("message:new", handleNewMessage);

     return () => {
       socket.off("message:new", handleNewMessage);
     };
   }, [socket, groupId, activityId, user]);
   ```

**What Must NOT Change:**

- Chat UI layout
- Message display components
- Send message functionality
- Any styling
- Component structure

**Validation:**

- Messages from other users appear in real-time
- Own messages still appear immediately
- No duplicate messages
- Scroll behavior unchanged

---

## Task 9: Remove Unused API Endpoints

**Scope:** Clean up calls to non-existent backend endpoints

**Files to Touch:**

- `frontend-master/src/services/apiService.ts`
- `frontend-master/App.tsx`

**What Changes:**

1. Remove or comment out these functions in apiService:

   - `recordActivity()` - Backend doesn't have `/api/activities` POST
   - `uploadFile()` - Backend doesn't have `/api/submissions`
   - `getMySubmissions()` - Backend doesn't have `/api/submissions` GET
   - `downloadFile()` - Backend doesn't have `/api/files/:fileId`
   - `getGroupById()` - Backend doesn't have `/api/groups/:groupId`

2. In App.tsx, remove calls to:

   - `apiService.recordActivity()` - Activity recording happens in `/api/appdata`
   - Direct fetch to `/api/submissions` - Use `/api/sync/activity/file` instead

3. Update file submission logic:
   - Remove GridFS upload code
   - Use `syncActivityFile()` with pre-uploaded file URL
   - Or remove file upload entirely if not needed

**What Must NOT Change:**

- Any working functionality
- UI components
- User workflows
- Other API calls

**Validation:**

- No 404 errors in network tab
- No console errors
- App still functions correctly
- No broken features

---

## Task 10: Add Error Handling for Socket Events

**Scope:** Add comprehensive error handling for socket operations

**Files to Touch:**

- `frontend-master/src/services/socketService.ts`
- `frontend-master/App.tsx`

**What Changes:**

1. In socketService, add error event handler:

   ```typescript
   socket.on("error", (error) => {
     console.error("Socket error:", error.message);

     if (error.message === "Authentication required") {
       this.reauthenticate();
     } else {
       // Emit error to subscribers
       this.errorHandlers.forEach((handler) => handler(error));
     }
   });
   ```

2. In App.tsx, add error listener:

   ```typescript
   useSocketEvent(
     "error",
     (error) => {
       console.error("Socket error:", error);
       // Optionally show error to user
       // But don't break the UI
     },
     []
   );
   ```

3. Add connection error handling:
   ```typescript
   socket.on("connect_error", (error) => {
     console.error("Connection error:", error);
     // Set connection status
     // Optionally show indicator to user
   });
   ```

**What Must NOT Change:**

- Any UI components
- Error display patterns (if they exist)
- User workflows
- Other functionality

**Validation:**

- Errors logged to console
- App doesn't crash on errors
- Reconnection works after errors
- User experience unchanged

---

## Task 11: Add Connection Status Indicator (Optional)

**Scope:** Add subtle connection status indicator to UI

**Files to Touch:**

- `frontend-master/components/BackendStatus.tsx` (EXISTS - currently commented out)
- `frontend-master/App.tsx` or `DashboardLayout.tsx`

**What Changes:**

1. Uncomment and update `BackendStatus.tsx`:

   - Use socket connection status instead of health check
   - Show: Connected, Disconnected, Reconnecting
   - Small, non-intrusive indicator

2. Add to DashboardLayout or App:

   ```typescript
   import BackendStatus from "./components/BackendStatus";

   // In render:
   <BackendStatus />;
   ```

**What Must NOT Change:**

- Main UI layout
- Navigation
- Content areas
- User workflows

**Validation:**

- Indicator shows correct status
- Doesn't interfere with UI
- Updates in real-time
- Minimal visual impact

---

## Task 12: Update Admin Dashboard for Real-Time

**Scope:** Ensure admin dashboard uses real-time data

**Files to Touch:**

- `frontend-master/components/pages/AdminDashboardPage.tsx`

**What Changes:**

1. Verify `watchStudents` and `watchGroups` are called
2. Ensure state updates when socket events received
3. No changes needed if parent (App.tsx) handles socket events

**What Must NOT Change:**

- Dashboard UI layout
- Tables and displays
- Admin controls
- Styling

**Validation:**

- Admin sees real-time group updates
- Admin sees real-time student updates
- No polling in network tab
- Dashboard still functional

---

## Task 13: Add Reconnection Handling

**Scope:** Handle socket reconnection gracefully

**Files to Touch:**

- `frontend-master/src/services/socketService.ts`
- `frontend-master/App.tsx`

**What Changes:**

1. In socketService, add reconnection logic:

   ```typescript
   socket.on("connect", async () => {
     if (this.wasConnected) {
       // This is a reconnection
       await this.authenticate(this.lastToken);

       // Re-join groups
       this.rejoinGroups();
     }
     this.wasConnected = true;
   });
   ```

2. In App.tsx, handle reconnection:
   ```typescript
   useEffect(() => {
     if (connected && authenticated) {
       // Refresh data after reconnection
       // But don't reload entire app
     }
   }, [connected, authenticated]);
   ```

**What Must NOT Change:**

- User experience during reconnection
- UI state
- User's work in progress
- Navigation state

**Validation:**

- Reconnection works automatically
- User doesn't lose data
- Real-time updates resume
- No duplicate subscriptions

---

## Task 14: Add TypeScript Types for Socket Events

**Scope:** Add type safety for socket events

**Files to Touch:**

- `frontend-master/types.ts` (UPDATE)
- `frontend-master/src/services/socketService.ts` (UPDATE)

**What Changes:**

1. Add socket event types to `types.ts`:

   ```typescript
   export interface SocketEvents {
     authenticated: { userId: string; groups: string[] };
     "group:updated": Group;
     "message:new": Message;
     "news:updated": NewsItem;
     "exam:updated": any; // Define exam type if needed
     error: { message: string };
   }
   ```

2. Update socketService to use types:
   ```typescript
   on<K extends keyof SocketEvents>(
     event: K,
     handler: (data: SocketEvents[K]) => void
   ): void
   ```

**What Must NOT Change:**

- Runtime behavior
- Any component code
- Event handling logic

**Validation:**

- TypeScript compilation succeeds
- Type errors caught at compile time
- Autocomplete works in IDE
- No runtime changes

---

## Task 15: Testing and Validation

**Scope:** Comprehensive testing of all changes

**Files to Touch:**

- All modified files

**What to Test:**

1. **API Integration:**

   - [ ] All sync functions call correct endpoints
   - [ ] Data persists to backend
   - [ ] No 404 errors
   - [ ] Type transformations work

2. **Socket Connection:**

   - [ ] Socket connects on app load
   - [ ] Authentication succeeds
   - [ ] Reconnection works
   - [ ] Error handling works

3. **Real-Time Updates:**

   - [ ] Group updates appear in real-time
   - [ ] Messages appear in real-time
   - [ ] News updates appear in real-time
   - [ ] No duplicate updates

4. **Polling Removal:**

   - [ ] No polling requests in network tab
   - [ ] Initial data still loads
   - [ ] Performance improved

5. **UI/UX:**

   - [ ] All pages render correctly
   - [ ] No visual changes
   - [ ] No workflow changes
   - [ ] No broken features

6. **Error Cases:**
   - [ ] Network errors handled
   - [ ] Socket errors handled
   - [ ] Authentication errors handled
   - [ ] App doesn't crash

**What Must NOT Change:**

- Any UI appearance
- Any user workflows
- Any navigation patterns
- Any styling

**Validation:**

- All tests pass
- No regressions
- Performance improved
- User experience unchanged

---

## Task Execution Order

Execute tasks in this exact order:

1. Task 1: Fix Sync Service Endpoint Paths
2. Task 2: Add Type Transformers
3. Task 3: Create Socket.io Service
4. Task 4: Create React Hooks
5. Task 5: Replace Polling in apiService
6. Task 9: Remove Unused API Endpoints
7. Task 6: Add Socket Event Listeners to App.tsx
8. Task 7: Add Group Room Management
9. Task 8: Add Real-Time Messages
10. Task 10: Add Error Handling
11. Task 13: Add Reconnection Handling
12. Task 14: Add TypeScript Types
13. Task 11: Add Connection Status Indicator (Optional)
14. Task 12: Update Admin Dashboard
15. Task 15: Testing and Validation

---

## Rollback Strategy

If any task causes issues:

1. **Immediate Rollback:**

   - Revert the specific file changes
   - Test that app still works
   - Document the issue

2. **Partial Rollback:**

   - Keep completed tasks
   - Skip problematic task
   - Continue with remaining tasks

3. **Full Rollback:**
   - Revert all changes
   - Return to polling-based implementation
   - Investigate issues before retry

---

## Success Criteria

- ✅ All sync endpoints call correct backend paths
- ✅ Socket.io connection established and authenticated
- ✅ Real-time updates working (< 1 second delay)
- ✅ No polling requests in network tab
- ✅ UI completely unchanged
- ✅ No regressions in functionality
- ✅ All tests passing
- ✅ No console errors
- ✅ Performance improved
- ✅ Type safety maintained

---

## Notes

- Each task is isolated and can be tested independently
- Tasks build on each other - follow the order
- Test after each task before proceeding
- Document any issues encountered
- Keep commits small and focused
- UI must remain exactly the same

---

_Task List Created: December 13, 2025_
