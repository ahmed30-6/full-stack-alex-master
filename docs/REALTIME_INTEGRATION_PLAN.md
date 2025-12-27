# Real-Time Integration Plan

## Executive Summary

This document outlines the plan to replace polling-based data fetching with Socket.io real-time events. The integration will maintain the exact same UI/UX while improving performance and reducing server load.

---

## Current Polling Implementation

### Polling Functions in `apiService.ts`

| Function                | Endpoint              | Interval | Purpose                         |
| ----------------------- | --------------------- | -------- | ------------------------------- |
| `watchStudents()`       | `GET /api/users`      | 10s      | Admin dashboard - student list  |
| `watchGroups()`         | `GET /api/groups`     | 15s      | Admin dashboard - group list    |
| `watchActivities()`     | `GET /api/activities` | 10s      | Admin dashboard - activity feed |
| `watchStudentByEmail()` | `POST /api/profile`   | 10s      | Individual student monitoring   |

**Problems with Current Approach:**

- High server load from repeated requests
- Delayed updates (10-15 second lag)
- Wasted bandwidth when no changes occur
- No real-time collaboration experience
- Battery drain on mobile devices

---

## Socket.io Events Available

### Server → Client Events (from SOCKET_IO_EVENTS.md)

| Event           | Broadcast To      | Payload              | Trigger                |
| --------------- | ----------------- | -------------------- | ---------------------- |
| `authenticated` | Individual socket | `{ userId, groups }` | After successful auth  |
| `exam:updated`  | All clients       | Exam data            | Admin updates exam     |
| `news:updated`  | All clients       | News data            | Admin updates news     |
| `group:updated` | Group members     | Group data           | Group created/modified |
| `message:new`   | Group members     | Message data         | New message sent       |
| `error`         | Individual socket | `{ message }`        | Any error occurs       |

### Client → Server Events

| Event          | Payload       | Purpose                        |
| -------------- | ------------- | ------------------------------ |
| `authenticate` | `{ token }`   | Authenticate socket connection |
| `join:group`   | `{ groupId }` | Join group room for updates    |
| `leave:group`  | `{ groupId }` | Leave group room               |

---

## Integration Strategy

### Phase 1: Socket.io Connection Setup

**File:** `frontend-master/src/services/socketService.ts` (NEW)

**Responsibilities:**

- Establish Socket.io connection
- Handle authentication
- Manage connection lifecycle
- Provide event subscription interface
- Handle reconnection logic

**State Management:**

- Connection status (connected, disconnected, authenticating)
- Authenticated status
- User's group memberships
- Error state

**NO UI CHANGES** - This is pure logic layer

---

### Phase 2: Replace Polling with Real-Time

#### 2.1 Replace `watchStudents()` Polling

**Current Implementation:**

```typescript
// apiService.ts - CURRENT
watchStudents(callback: (students: any[]) => void): Unsubscribe {
  let stopped = false;
  const fetchAndEmit = async () => {
    try {
      const students = await this.getUsers();
      // ... resolve avatars ...
      if (!stopped) callback(resolved);
    } catch (err) {
      if (!stopped) callback([]);
    }
  };
  fetchAndEmit();
  const id = setInterval(fetchAndEmit, 10000); // poll every 10s
  return () => { stopped = true; clearInterval(id); };
}
```

**New Implementation Strategy:**

```typescript
// socketService.ts - NEW
watchStudents(callback: (students: any[]) => void): Unsubscribe {
  // Initial fetch via REST API
  apiService.getUsers().then(callback);

  // Listen for real-time updates
  // Note: Backend doesn't emit user:updated events yet
  // For now, keep initial fetch only, remove polling

  return () => {
    // Cleanup if needed
  };
}
```

**Required Backend Addition:**

- Backend should emit `user:updated` event when users are created/modified
- OR keep initial REST fetch without polling (acceptable for user list)

**UI Components Affected:**

- `AdminDashboardPage.tsx` - Uses `watchStudents` in useEffect
- **NO UI CHANGES** - Same callback interface

---

#### 2.2 Replace `watchGroups()` Polling

**Current Implementation:**

```typescript
// apiService.ts - CURRENT
watchGroups(callback: (groups: Group[]) => void): Unsubscribe {
  let stopped = false;
  const fetchAndEmit = async () => {
    try {
      const resp = await fetch(API_BASE + '/groups', { headers });
      const json = await resp.json();
      if (!stopped) callback(json.groups || []);
    } catch (err) {
      if (!stopped) callback([]);
    }
  };
  fetchAndEmit();
  const id = setInterval(fetchAndEmit, 15000);
  return () => { stopped = true; clearInterval(id); };
}
```

**New Implementation Strategy:**

```typescript
// socketService.ts - NEW
watchGroups(callback: (groups: Group[]) => void): Unsubscribe {
  // Initial fetch via REST API
  apiService.getGroups().then(callback);

  // Listen for real-time group updates
  const handleGroupUpdate = (groupData: any) => {
    // Merge updated group into current list
    // Call callback with updated list
  };

  socket.on('group:updated', handleGroupUpdate);

  return () => {
    socket.off('group:updated', handleGroupUpdate);
  };
}
```

**Backend Support:** ✅ Already exists - `group:updated` event

**UI Components Affected:**

- `AdminDashboardPage.tsx` - Uses `watchGroups` in useEffect
- `GroupFormationPage.tsx` - May need group updates
- **NO UI CHANGES** - Same callback interface

**State Management:**

- Maintain local groups array
- On `group:updated`, find and replace matching group by ID
- If group not found, append to array
- Call callback with updated array

---

#### 2.3 Replace `watchActivities()` Polling

**Current Implementation:**

```typescript
// apiService.ts - CURRENT
watchActivities(callback: (activities: Activity[]) => void): Unsubscribe {
  let stopped = false;
  const fetchAndEmit = async () => {
    try {
      const resp = await fetch(API_BASE + '/activities', { headers });
      const json = await resp.json();
      if (!stopped) callback(json.activities || []);
    } catch (err) {
      if (!stopped) callback([]);
    }
  };
  fetchAndEmit();
  const id = setInterval(fetchAndEmit, 10000);
  return () => { stopped = true; clearInterval(id); };
}
```

**New Implementation Strategy:**

```typescript
// socketService.ts - NEW
watchActivities(callback: (activities: Activity[]) => void): Unsubscribe {
  // Backend doesn't have /api/activities endpoint
  // AND doesn't emit activity events

  // Option 1: Remove this entirely (activities stored in appData)
  // Option 2: Keep initial fetch if backend adds endpoint
  // Option 3: Use message:new events as activity proxy

  // RECOMMENDED: Remove this function
  callback([]);
  return () => {};
}
```

**Backend Support:** ❌ No `/api/activities` endpoint, no activity events

**UI Components Affected:**

- `AdminDashboardPage.tsx` - Uses `watchActivities` in useEffect
- **ACTION:** Remove activity watching or use alternative data source

---

#### 2.4 Replace `watchStudentByEmail()` Polling

**Current Implementation:**

```typescript
// apiService.ts - CURRENT
watchStudentByEmail(email: string, callback: (student: any | null) => void): Unsubscribe {
  let stopped = false;
  const fetchAndEmit = async () => {
    try {
      const resp = await fetch(API_BASE + '/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ email })
      });
      const json = await resp.json();
      if (!stopped) callback(json.student || null);
    } catch (err) {
      if (!stopped) callback(null);
    }
  };
  fetchAndEmit();
  const id = setInterval(fetchAndEmit, 10000);
  return () => { stopped = true; clearInterval(id); };
}
```

**New Implementation Strategy:**

```typescript
// socketService.ts - NEW
watchStudentByEmail(email: string, callback: (student: any | null) => void): Unsubscribe {
  // Initial fetch only, no polling
  apiService.getUserProfile(email).then(callback);

  // No real-time updates needed for profile viewing
  // Profile changes are infrequent

  return () => {};
}
```

**Backend Support:** Not needed - profiles don't change frequently

**UI Components Affected:**

- Check if any component uses this function
- **NO UI CHANGES** - Same callback interface

---

### Phase 3: Add Real-Time Message Updates

**Current Implementation:**

- Messages stored in local state (`discussions` in App.tsx)
- No real-time updates when other users send messages
- Manual refresh required

**New Implementation:**

```typescript
// In CollaborativeLearningPage or message components
useEffect(() => {
  if (!socket || !groupId) return;

  // Join group room
  socket.emit("join:group", { groupId });

  // Listen for new messages
  const handleNewMessage = (messageData: any) => {
    if (messageData.groupId === groupId) {
      // Add message to local state
      setMessages((prev) => [...prev, messageData]);
    }
  };

  socket.on("message:new", handleNewMessage);

  return () => {
    socket.emit("leave:group", { groupId });
    socket.off("message:new", handleNewMessage);
  };
}, [socket, groupId]);
```

**Backend Support:** ✅ Already exists - `message:new` event

**UI Components Affected:**

- `CollaborativeLearningPage.tsx` - Chat interface
- **NO UI CHANGES** - Messages appear automatically

**State Updates:**

- When `message:new` received, append to messages array
- UI re-renders automatically with new message
- Scroll to bottom if user is near bottom

---

### Phase 4: Add Admin Broadcast Features

#### 4.1 Exam Updates

**Backend Event:** `exam:updated` (broadcast to all clients)

**Frontend Implementation:**

```typescript
// In App.tsx or exam-related components
useEffect(() => {
  if (!socket) return;

  const handleExamUpdate = (examData: any) => {
    // Update exam state
    setCurrentExam(examData);

    // Show notification to user
    showNotification(`New exam available: ${examData.title}`);
  };

  socket.on("exam:updated", handleExamUpdate);

  return () => {
    socket.off("exam:updated", handleExamUpdate);
  };
}, [socket]);
```

**UI Components Affected:**

- Quiz pages - May need to refresh available exams
- **NO UI CHANGES** - Just data updates

---

#### 4.2 News Updates

**Backend Event:** `news:updated` (broadcast to all clients)

**Frontend Implementation:**

```typescript
// In App.tsx or NewsPage
useEffect(() => {
  if (!socket) return;

  const handleNewsUpdate = (newsData: any) => {
    // Update news items
    setNewsItems((prev) => {
      const existing = prev.find((n) => n.id === newsData.newsId);
      if (existing) {
        return prev.map((n) => (n.id === newsData.newsId ? newsData : n));
      } else {
        return [newsData, ...prev];
      }
    });

    // Show notification
    showNotification(`New announcement: ${newsData.title}`);
  };

  socket.on("news:updated", handleNewsUpdate);

  return () => {
    socket.off("news:updated", handleNewsUpdate);
  };
}, [socket]);
```

**UI Components Affected:**

- `NewsPage.tsx` - News feed
- **NO UI CHANGES** - News appears automatically

---

## Frontend State Management

### States That Will Listen to Socket Events

| State         | Component  | Socket Event            | Update Logic              |
| ------------- | ---------- | ----------------------- | ------------------------- |
| `groups`      | App.tsx    | `group:updated`         | Merge/replace group by ID |
| `discussions` | App.tsx    | `message:new`           | Append message to array   |
| `newsItems`   | App.tsx    | `news:updated`          | Merge/replace news by ID  |
| `allStudents` | App.tsx    | `user:updated` (future) | Merge/replace user by ID  |
| `currentExam` | Quiz pages | `exam:updated`          | Replace exam data         |

### States That Will NOT Change

| State              | Reason                                 |
| ------------------ | -------------------------------------- |
| `user`             | Current user doesn't change via socket |
| `currentPage`      | Navigation is local                    |
| `completedLessons` | User-specific progress                 |
| `moduleScores`     | Updated via REST API                   |
| `unlockedModules`  | Updated via REST API                   |

---

## Connection Lifecycle

### 1. Initial Connection

```typescript
// On app load or user login
const socket = io(API_BASE, {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

socket.on("connect", async () => {
  const token = await auth.currentUser.getIdToken();
  socket.emit("authenticate", { token });
});

socket.on("authenticated", (data) => {
  console.log("Authenticated:", data.userId);
  console.log("Groups:", data.groups);

  // Auto-join all user's groups
  data.groups.forEach((groupId) => {
    socket.emit("join:group", { groupId });
  });
});
```

### 2. Reconnection Handling

```typescript
socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
  // Show connection status indicator
  setConnectionStatus("disconnected");
});

socket.on("connect", async () => {
  console.log("Reconnected");
  // Re-authenticate
  const token = await auth.currentUser.getIdToken();
  socket.emit("authenticate", { token });

  // Connection status will update on 'authenticated' event
});
```

### 3. Error Handling

```typescript
socket.on("error", (error) => {
  console.error("Socket error:", error.message);

  if (error.message === "Authentication required") {
    // Re-authenticate
    reauthenticate();
  } else if (error.message.includes("Not authorized")) {
    // Show error to user
    showError("You do not have permission for this action");
  } else {
    // Generic error
    showError("Connection error. Please try again.");
  }
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
  setConnectionStatus("error");
});
```

---

## Implementation Files

### New Files to Create

1. **`frontend-master/src/services/socketService.ts`**

   - Socket.io connection management
   - Authentication handling
   - Event subscription interface
   - Reconnection logic

2. **`frontend-master/src/hooks/useSocket.ts`**

   - React hook for socket connection
   - Returns socket instance and connection status
   - Handles lifecycle in React components

3. **`frontend-master/src/hooks/useSocketEvent.ts`**
   - React hook for subscribing to socket events
   - Automatic cleanup on unmount
   - Type-safe event handling

### Files to Modify

1. **`frontend-master/src/services/apiService.ts`**

   - Remove polling intervals from `watchStudents`, `watchGroups`, `watchActivities`
   - Keep initial REST API fetch
   - Remove `setInterval` calls

2. **`frontend-master/App.tsx`**

   - Add socket connection initialization
   - Add socket event listeners for `group:updated`, `message:new`, `news:updated`
   - Update state when events received
   - **NO UI CHANGES**

3. **`frontend-master/components/pages/CollaborativeLearningPage.tsx`**

   - Add `message:new` event listener
   - Join/leave group rooms
   - **NO UI CHANGES**

4. **`frontend-master/components/pages/AdminDashboardPage.tsx`**

   - Replace polling with socket event listeners
   - **NO UI CHANGES**

5. **`frontend-master/components/pages/NewsPage.tsx`**
   - Add `news:updated` event listener
   - **NO UI CHANGES**

---

## Testing Strategy

### Unit Tests

- Socket connection establishment
- Authentication flow
- Event subscription/unsubscription
- Reconnection logic
- Error handling

### Integration Tests

- Message sending and receiving
- Group updates propagation
- News updates propagation
- Multi-user scenarios

### Manual Testing Checklist

- [ ] Socket connects on app load
- [ ] Socket authenticates with Firebase token
- [ ] User auto-joins their groups
- [ ] New messages appear in real-time
- [ ] Group updates appear in real-time
- [ ] News updates appear in real-time
- [ ] Reconnection works after disconnect
- [ ] Error messages display correctly
- [ ] No polling requests in network tab
- [ ] UI remains unchanged
- [ ] Performance improved (less network traffic)

---

## Rollback Plan

If issues arise:

1. **Keep both implementations temporarily**

   - Socket.io for real-time updates
   - Polling as fallback
   - Feature flag to switch between them

2. **Gradual rollout**

   - Enable Socket.io for admin users first
   - Monitor for issues
   - Enable for all users after validation

3. **Fallback mechanism**
   - If socket disconnects, fall back to polling
   - Show connection status indicator
   - Allow manual refresh

---

## Performance Improvements

### Before (Polling)

- Admin dashboard: 3 requests every 10-15 seconds
- ~12-18 requests per minute
- ~720-1080 requests per hour
- High server load
- 10-15 second update delay

### After (Socket.io)

- Admin dashboard: 1 initial connection + authentication
- Real-time updates (< 1 second delay)
- ~95% reduction in HTTP requests
- Lower server load
- Better battery life on mobile

---

## Security Considerations

### Authentication

- Socket authenticated with Firebase ID token
- Token verified on server before joining rooms
- Tokens refreshed before expiration

### Authorization

- Users can only join groups they're members of
- Server validates group membership
- Admin-only events restricted

### Data Validation

- All incoming socket data validated
- Sanitize user-generated content
- Rate limiting on socket events (backend)

---

## Migration Timeline

### Week 1: Setup

- Create socket service files
- Add socket connection to App.tsx
- Test connection and authentication

### Week 2: Replace Polling

- Replace `watchGroups` with socket events
- Replace `watchStudents` (or remove polling)
- Test admin dashboard

### Week 3: Add Real-Time Features

- Add `message:new` listener
- Add `news:updated` listener
- Test collaborative features

### Week 4: Testing & Refinement

- Comprehensive testing
- Performance monitoring
- Bug fixes
- Documentation

---

## Success Criteria

- ✅ No polling intervals in code
- ✅ Real-time updates working (< 1 second delay)
- ✅ UI unchanged (same look and feel)
- ✅ No regressions in functionality
- ✅ Improved performance metrics
- ✅ Reduced server load
- ✅ All tests passing

---

_Plan Created: December 13, 2025_
