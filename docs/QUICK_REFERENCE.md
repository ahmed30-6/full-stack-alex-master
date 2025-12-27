# Quick Reference Guide

## Endpoint Corrections Needed

### Sync Service Fixes (syncService.ts)

```typescript
// ❌ WRONG
POST / api / sync / score;
POST / api / sync / login;
POST / api / sync / activity - message;
POST / api / sync / activity - file;

// ✅ CORRECT
POST / api / scores;
POST / api / sync / login - time;
POST / api / sync / activity / message;
POST / api / sync / activity / file;
```

---

## Type Transformations Needed

### Group Payload

```typescript
// ❌ Frontend sends:
{
  id: string,
  name: string,
  level: CognitiveLevel, // "أساسي" | "متوسط" | "متقدم"
  members: User[] // Full user objects
}

// ✅ Backend expects:
{
  name: string,
  type: 'single' | 'multi',
  members: string[], // firebaseUid strings
  level: number // 1, 2, or 3
}
```

### Activity ID

```typescript
// ❌ Frontend sends:
{
  activityId: 5;
} // number

// ✅ Backend expects:
{
  activityId: "5";
} // string
```

---

## Socket.io Events

### Client → Server

```typescript
socket.emit("authenticate", { token: string });
socket.emit("join:group", { groupId: string });
socket.emit("leave:group", { groupId: string });
```

### Server → Client

```typescript
socket.on("authenticated", (data: { userId: string; groups: string[] }) => {});
socket.on("group:updated", (group: Group) => {});
socket.on("message:new", (message: Message) => {});
socket.on("news:updated", (news: NewsItem) => {});
socket.on("exam:updated", (exam: any) => {});
socket.on("error", (error: { message: string }) => {});
```

---

## Polling to Remove

```typescript
// Remove these setInterval calls:
watchStudents(); // polls every 10s
watchGroups(); // polls every 15s
watchActivities(); // polls every 10s
watchStudentByEmail(); // polls every 10s
```

---

## Endpoints to Remove/Replace

### Remove (Don't Exist)

```typescript
POST /api/activities
GET /api/activities
POST /api/submissions
GET /api/submissions
GET /api/files/:fileId
GET /api/groups/:groupId
GET /api/appdata/all
```

### Replace With

```typescript
// Activities → embedded in /api/appdata
// Submissions → /api/sync/activity/file
// Files → use URL from ActivityFile
// Group by ID → GET /api/groups with filter
// All appdata → GET /api/appdata/:uid per user
```

---

## Files to Create

```
frontend-master/src/
├── services/
│   ├── socketService.ts (NEW)
│   └── typeTransformers.ts (NEW)
└── hooks/
    ├── useSocket.ts (NEW)
    └── useSocketEvent.ts (NEW)
```

---

## Files to Modify

```
frontend-master/
├── src/services/
│   ├── syncService.ts (fix endpoints)
│   └── apiService.ts (remove polling)
├── App.tsx (add socket listeners)
├── components/pages/
│   └── CollaborativeLearningPage.tsx (add message listener)
└── types.ts (add socket event types)
```

---

## Critical Rules

### ❌ NEVER CHANGE

- UI components
- Layouts
- Styles
- UX flows
- Navigation
- Component hierarchy

### ✅ ALWAYS CHANGE

- Endpoint paths
- Type transformations
- Polling → Socket.io
- Error handling
- Service layer

---

## Testing Commands

```bash
# Install dependencies
npm install socket.io-client

# Run frontend
npm run dev

# Check network tab
# Should see:
# - WebSocket connection
# - No polling requests
# - Correct endpoint paths

# Check console
# Should see:
# - "Connected to server"
# - "Authenticated: <userId>"
# - No 404 errors
```

---

## Common Issues

### Issue: Socket won't connect

```typescript
// Check:
1. Backend is running
2. CORS configured correctly
3. Firebase token is valid
4. Socket.io client version matches server
```

### Issue: 404 errors

```typescript
// Check:
1. Endpoint paths match backend
2. No typos in URLs
3. Backend routes registered
4. Authentication header present
```

### Issue: Type errors

```typescript
// Check:
1. Type transformers applied
2. activityId converted to string
3. members converted to firebaseUids
4. level converted to number
```

### Issue: Duplicate messages

```typescript
// Check:
1. Event listeners cleaned up on unmount
2. No duplicate subscriptions
3. Message deduplication logic
```

---

## Performance Targets

| Metric            | Before | After | Improvement |
| ----------------- | ------ | ----- | ----------- |
| HTTP Requests/min | 12-18  | 0-1   | 95% ↓       |
| Update Delay      | 10-15s | <1s   | 90% ↓       |
| Network Traffic   | High   | Low   | 80% ↓       |
| Battery Usage     | High   | Low   | 70% ↓       |

---

## Validation Checklist

### API Integration

- [ ] All endpoints return 200 OK
- [ ] Data persists to MongoDB
- [ ] No 404 errors in network tab
- [ ] Type transformations work

### Socket.io

- [ ] WebSocket connection established
- [ ] Authentication succeeds
- [ ] Events received in real-time
- [ ] Reconnection works

### UI/UX

- [ ] No visual changes
- [ ] All features work
- [ ] No console errors
- [ ] Performance improved

---

## Emergency Rollback

```bash
# If something breaks:
git stash  # Save current work
git checkout main  # Return to working version
git branch -D feature/integration  # Delete broken branch

# Or revert specific file:
git checkout main -- path/to/file.ts
```

---

## Task Order

1. Fix sync endpoints ✓
2. Add type transformers ✓
3. Create socket service ✓
4. Create React hooks ✓
5. Remove polling ✓
6. Remove unused endpoints ✓
7. Add socket listeners ✓
8. Add group rooms ✓
9. Add real-time messages ✓
10. Add error handling ✓
11. Add reconnection ✓
12. Add TypeScript types ✓
13. Test everything ✓

---

## Success Criteria

- ✅ No polling in network tab
- ✅ WebSocket connection active
- ✅ Real-time updates < 1s
- ✅ UI unchanged
- ✅ No regressions
- ✅ All tests pass

---

_Quick Reference Created: December 13, 2025_
