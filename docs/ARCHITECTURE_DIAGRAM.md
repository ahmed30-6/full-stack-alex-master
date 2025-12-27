# Architecture Diagram

## Current Architecture (Polling-Based)

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    App.tsx                            │  │
│  │  - User state                                         │  │
│  │  - Groups state                                       │  │
│  │  - Messages state                                     │  │
│  │  - News state                                         │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                          │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │              apiService.ts                           │  │
│  │                                                       │  │
│  │  watchStudents()  ──┐                               │  │
│  │  watchGroups()      │ Polling every 10-15s          │  │
│  │  watchActivities()  │ setInterval()                 │  │
│  │  watchStudent()     │                               │  │
│  └────────────────┬────┴───────────────────────────────┘  │
│                   │                                          │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │              syncService.ts                          │  │
│  │                                                       │  │
│  │  syncScore()         ❌ Wrong endpoint               │  │
│  │  syncLoginTime()     ❌ Wrong endpoint               │  │
│  │  syncActivityMsg()   ❌ Wrong endpoint               │  │
│  │  syncActivityFile()  ❌ Wrong endpoint               │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                          │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    │ HTTP Requests (REST API)
                    │ - Repeated polling
                    │ - High bandwidth
                    │ - 10-15s delay
                    │
┌───────────────────▼──────────────────────────────────────────┐
│                    BACKEND (Express + MongoDB)                │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    server.ts                            │ │
│  │  - Express app                                          │ │
│  │  - MongoDB connection                                   │ │
│  │  - Firebase Admin SDK                                   │ │
│  │  - Socket.io server (not used by frontend yet)         │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                           │
│  ┌────────────────▼───────────────────────────────────────┐ │
│  │                  Routes                                 │ │
│  │                                                         │ │
│  │  /api/users              ✅ Used (polling)             │ │
│  │  /api/groups             ✅ Used (polling)             │ │
│  │  /api/appdata            ✅ Used                       │ │
│  │  /api/scores             ❌ Not used (wrong path)      │ │
│  │  /api/sync/login-time    ❌ Not used (wrong path)      │ │
│  │  /api/sync/activity/*    ❌ Not used (wrong path)      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Socket.io Server (Unused)                  │ │
│  │                                                         │ │
│  │  Events available but not consumed:                    │ │
│  │  - authenticated                                        │ │
│  │  - group:updated                                        │ │
│  │  - message:new                                          │ │
│  │  - news:updated                                         │ │
│  │  - exam:updated                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    MongoDB                              │ │
│  │  - Users collection                                     │ │
│  │  - Groups collection                                    │ │
│  │  - Messages collection                                  │ │
│  │  - Scores collection                                    │ │
│  │  - AppData collection                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

**Problems:**

- ❌ Polling creates 12-18 requests per minute
- ❌ 10-15 second delay for updates
- ❌ High server load
- ❌ Wrong endpoint paths in sync service
- ❌ Socket.io available but not used

---

## Target Architecture (Real-Time)

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    App.tsx                            │  │
│  │  - User state                                         │  │
│  │  - Groups state      ◄─── Real-time updates          │  │
│  │  - Messages state    ◄─── Real-time updates          │  │
│  │  - News state        ◄─── Real-time updates          │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                          │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │         useSocket() / useSocketEvent()               │  │
│  │         (NEW React Hooks)                            │  │
│  │                                                       │  │
│  │  - Manage socket connection                          │  │
│  │  - Subscribe to events                               │  │
│  │  - Auto cleanup                                      │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                          │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │              socketService.ts (NEW)                  │  │
│  │                                                       │  │
│  │  connect()                                           │  │
│  │  authenticate(token)                                 │  │
│  │  on(event, handler)                                  │  │
│  │  emit(event, data)                                   │  │
│  │  getConnectionStatus()                               │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                          │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │              apiService.ts (UPDATED)                 │  │
│  │                                                       │  │
│  │  watchStudents()  ──┐ No more polling!              │  │
│  │  watchGroups()      │ Initial fetch only            │  │
│  │  watchActivities()  │ Then Socket.io updates        │  │
│  │  watchStudent()     │                               │  │
│  └────────────────┬────┴───────────────────────────────┘  │
│                   │                                          │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │         typeTransformers.ts (NEW)                    │  │
│  │                                                       │  │
│  │  userToFirebaseUid()                                 │  │
│  │  cognitiveToNumeric()                                │  │
│  │  activityIdToString()                                │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                          │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │              syncService.ts (FIXED)                  │  │
│  │                                                       │  │
│  │  syncScore()         ✅ /api/scores                  │  │
│  │  syncLoginTime()     ✅ /api/sync/login-time         │  │
│  │  syncActivityMsg()   ✅ /api/sync/activity/message   │  │
│  │  syncActivityFile()  ✅ /api/sync/activity/file      │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                          │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    │ ┌─────────────────────────────────┐
                    │ │  HTTP (REST API)                │
                    ├─┤  - Initial data fetch           │
                    │ │  - POST/PUT operations          │
                    │ │  - No polling!                  │
                    │ └─────────────────────────────────┘
                    │
                    │ ┌─────────────────────────────────┐
                    │ │  WebSocket (Socket.io)          │
                    └─┤  - Real-time updates            │
                      │  - < 1 second delay             │
                      │  - Bidirectional                │
                      └─────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────────────┐
│                    BACKEND (Express + MongoDB)                │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    server.ts                            │ │
│  │  - Express app                                          │ │
│  │  - MongoDB connection                                   │ │
│  │  - Firebase Admin SDK                                   │ │
│  │  - Socket.io server ✅ NOW USED                        │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                           │
│  ┌────────────────▼───────────────────────────────────────┐ │
│  │                  Routes                                 │ │
│  │                                                         │ │
│  │  /api/users              ✅ Used (initial fetch)       │ │
│  │  /api/groups             ✅ Used (initial fetch)       │ │
│  │  /api/appdata            ✅ Used                       │ │
│  │  /api/scores             ✅ NOW USED                   │ │
│  │  /api/sync/login-time    ✅ NOW USED                   │ │
│  │  /api/sync/activity/*    ✅ NOW USED                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Socket.io Server ✅ ACTIVE                 │ │
│  │                                                         │ │
│  │  Client → Server:                                      │ │
│  │    authenticate { token }                              │ │
│  │    join:group { groupId }                              │ │
│  │    leave:group { groupId }                             │ │
│  │                                                         │ │
│  │  Server → Client:                                      │ │
│  │    authenticated { userId, groups }                    │ │
│  │    group:updated { group data }                        │ │
│  │    message:new { message data }                        │ │
│  │    news:updated { news data }                          │ │
│  │    exam:updated { exam data }                          │ │
│  │    error { message }                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              RealtimeService                            │ │
│  │                                                         │ │
│  │  emitGroupUpdated(groupId, data)                       │ │
│  │  emitMessageNew(groupId, data)                         │ │
│  │  emitNewsUpdated(data)                                 │ │
│  │  emitExamUpdated(data)                                 │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    MongoDB                              │ │
│  │  - Users collection                                     │ │
│  │  - Groups collection                                    │ │
│  │  - Messages collection                                  │ │
│  │  - Scores collection                                    │ │
│  │  - AppData collection                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

**Benefits:**

- ✅ 95% fewer HTTP requests
- ✅ < 1 second update delay
- ✅ Lower server load
- ✅ Correct endpoint paths
- ✅ Real-time collaboration

---

## Data Flow: Message Sending

### Current Flow (Polling)

```
User types message
       │
       ▼
┌──────────────────┐
│ CollaborativePage│
│  handleSend()    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   App.tsx        │
│ handleSendMsg()  │
│ - Add to state   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  syncService     │
│ syncActivityMsg()│ ❌ Wrong endpoint
└────────┬─────────┘
         │
         ▼
    Backend API
    (404 error)
         │
         ▼
    Other users
    don't see it
    until they
    refresh or
    wait 10-15s
```

### Target Flow (Real-Time)

```
User types message
       │
       ▼
┌──────────────────┐
│ CollaborativePage│
│  handleSend()    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   App.tsx        │
│ handleSendMsg()  │
│ - Add to state   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  syncService     │
│ syncActivityMsg()│ ✅ Correct endpoint
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Backend API    │
│ POST /api/sync/  │
│  activity/message│
│ - Save to DB     │
│ - Emit socket    │
└────────┬─────────┘
         │
         ├─────────────────────┐
         │                     │
         ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│  Socket.io       │  │  Socket.io       │
│  (Sender)        │  │  (Other Users)   │
│  message:new     │  │  message:new     │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         │                     ▼
         │            ┌──────────────────┐
         │            │   App.tsx        │
         │            │ - Update state   │
         │            │ - Re-render      │
         │            └──────────────────┘
         │                     │
         ▼                     ▼
    Message appears    Message appears
    immediately        in < 1 second
```

---

## Component Hierarchy

```
App.tsx
├── useSocket() ◄─── NEW
│   └── socketService ◄─── NEW
│
├── DashboardLayout
│   ├── Sidebar
│   └── Header
│
├── HomePage
├── NewsPage ◄─── Listens to news:updated
├── ContentPage
├── ProfilePage
├── AdminDashboardPage ◄─── Uses watchStudents, watchGroups
│
├── LearningPathPage
├── ModuleContentPage
├── GroupFormationPage ◄─── Listens to group:updated
│
├── ActivityPage
└── CollaborativeLearningPage ◄─── Listens to message:new
    ├── Chat Interface
    └── File Upload
```

---

## State Management Flow

```
┌─────────────────────────────────────────────────────────┐
│                      App.tsx State                       │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │   groups   │  │ discussions│  │  newsItems │       │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘       │
│         │               │               │              │
│         │               │               │              │
└─────────┼───────────────┼───────────────┼──────────────┘
          │               │               │
          │               │               │
    ┌─────▼───────┐ ┌─────▼───────┐ ┌───▼─────────┐
    │ Socket.io   │ │ Socket.io   │ │ Socket.io   │
    │ group:      │ │ message:    │ │ news:       │
    │ updated     │ │ new         │ │ updated     │
    └─────▲───────┘ └─────▲───────┘ └───▲─────────┘
          │               │               │
          │               │               │
    ┌─────┴───────────────┴───────────────┴─────────┐
    │            Backend Socket.io Server            │
    │                                                 │
    │  Emits events when:                            │
    │  - Admin creates/updates group                 │
    │  - User sends message                          │
    │  - Admin updates news                          │
    └─────────────────────────────────────────────────┘
```

---

## File Structure

### Current Structure

```
frontend-master/
├── src/
│   ├── services/
│   │   ├── apiService.ts      (polling)
│   │   └── syncService.ts     (wrong endpoints)
│   └── firebase.ts
├── App.tsx
└── components/
    └── pages/
        ├── AdminDashboardPage.tsx
        ├── CollaborativeLearningPage.tsx
        └── ...
```

### Target Structure

```
frontend-master/
├── src/
│   ├── services/
│   │   ├── apiService.ts           (no polling)
│   │   ├── syncService.ts          (fixed endpoints)
│   │   ├── socketService.ts        ◄─── NEW
│   │   └── typeTransformers.ts     ◄─── NEW
│   ├── hooks/
│   │   ├── useSocket.ts            ◄─── NEW
│   │   └── useSocketEvent.ts       ◄─── NEW
│   └── firebase.ts
├── App.tsx                          (+ socket listeners)
├── types.ts                         (+ socket event types)
└── components/
    └── pages/
        ├── AdminDashboardPage.tsx   (uses real-time)
        ├── CollaborativeLearningPage.tsx (+ message listener)
        └── ...
```

---

## Network Traffic Comparison

### Before (Polling)

```
Time: 0s ──────────────────────────────────────────────► 60s

HTTP Requests:
│
├─ GET /api/users (10s intervals)
│  ├─ 0s
│  ├─ 10s
│  ├─ 20s
│  ├─ 30s
│  ├─ 40s
│  ├─ 50s
│  └─ 60s  (7 requests)
│
├─ GET /api/groups (15s intervals)
│  ├─ 0s
│  ├─ 15s
│  ├─ 30s
│  ├─ 45s
│  └─ 60s  (5 requests)
│
└─ GET /api/activities (10s intervals)
   ├─ 0s
   ├─ 10s
   ├─ 20s
   ├─ 30s
   ├─ 40s
   ├─ 50s
   └─ 60s  (7 requests)

Total: 19 requests in 60 seconds
Average: 19 requests/minute
```

### After (Real-Time)

```
Time: 0s ──────────────────────────────────────────────► 60s

Initial Connection:
│
├─ WebSocket connect (0s)
├─ authenticate (0s)
├─ GET /api/users (0s) - initial fetch
└─ GET /api/groups (0s) - initial fetch

Real-Time Events (only when data changes):
│
├─ message:new (when user sends message)
├─ group:updated (when admin updates group)
└─ news:updated (when admin updates news)

Total: 4 initial requests + events only when needed
Average: ~0-1 requests/minute (after initial load)
```

---

## Security Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend                              │
│                                                          │
│  1. User logs in with Firebase                          │
│     ├─ Firebase Auth                                    │
│     └─ Get ID Token                                     │
│                                                          │
│  2. Connect Socket.io                                   │
│     ├─ socket.connect()                                 │
│     └─ socket.emit('authenticate', { token })           │
│                                                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ WebSocket + Token
                     │
┌────────────────────▼────────────────────────────────────┐
│                    Backend                               │
│                                                          │
│  3. Verify Token                                        │
│     ├─ Firebase Admin SDK                               │
│     ├─ Verify ID Token                                  │
│     └─ Extract user info                                │
│                                                          │
│  4. Authorize                                           │
│     ├─ Check user role                                  │
│     ├─ Check group membership                           │
│     └─ Grant/deny access                                │
│                                                          │
│  5. Join Rooms                                          │
│     ├─ Auto-join user's groups                          │
│     └─ Store socket → user mapping                      │
│                                                          │
│  6. Emit Events                                         │
│     ├─ Only to authorized users                         │
│     ├─ Only to group members                            │
│     └─ Validate all data                                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

_Architecture Diagrams v1.0_  
_Created: December 13, 2025_
