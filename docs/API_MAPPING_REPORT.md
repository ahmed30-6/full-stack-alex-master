# Frontend-Backend API Mapping Report

## Executive Summary

This document maps all frontend API calls to backend endpoints, identifies mismatches, and recommends integration actions. The analysis covers both REST API calls and real-time Socket.io requirements.

---

## 1. User Management

### 1.1 User Sync/Creation

**Frontend Function:** `apiService.addUser(userData)`  
**Backend Endpoint:** `POST /api/users`  
**HTTP Method:** POST  
**Request Payload:**

```typescript
{
  name: string;
  email: string;
  avatar?: string;
  updateName?: boolean;
}
```

**Response Payload:**

```typescript
{
  user: {
    _id: string;
    firebaseUid: string;
    username: string;
    email: string;
    name: string;
    avatar: string | null;
    role: string;
    // ... other fields
  }
}
```

**Status:** ✅ MATCH  
**Required Action:** None - endpoint exists and matches

---

### 1.2 Get User Profile

**Frontend Function:** `apiService.getUserProfile(email)`  
**Backend Endpoint:** `POST /api/profile`  
**HTTP Method:** POST  
**Request Payload:**

```typescript
{
  email: string;
  firebaseUid?: string;
}
```

**Response Payload:**

```typescript
{
  user: {
    firebaseUid: string;
    username: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    // ... other fields
  } | null
}
```

**Status:** ✅ MATCH  
**Required Action:** None

---

### 1.3 Get All Users (Admin)

**Frontend Function:** `apiService.getUsers()`  
**Backend Endpoint:** `GET /api/users`  
**HTTP Method:** GET  
**Request Payload:** None (query params: role, status, limit, skip)  
**Response Payload:**

```typescript
{
  users: Array<User>;
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  }
}
```

**Status:** ✅ MATCH  
**Required Action:** None

---

## 2. Learning Path & App Data

### 2.1 Save App Data

**Frontend Function:** `apiService.saveAppData(data)`  
**Backend Endpoint:** `POST /api/appdata`  
**HTTP Method:** POST  
**Request Payload:**

```typescript
{
  moduleScores?: object;
  completedLessons?: object;
  finalQuizPassed?: boolean;
  unlockedModules?: number[];
  currentActivityId?: number | null;
  currentModuleId?: number | null;
  moduleLessonIndex?: number;
  modulePageIndex?: number;
  learningPathTopic?: string | null;
  groups?: any[];
  discussions?: any[];
  newsItems?: any[];
}
```

**Response Payload:**

```typescript
{
  appData: {
    email: string;
    moduleScores: object;
    completedLessons: object;
    finalQuizPassed: boolean;
    unlockedModules: number[];
    // ... all fields
  }
}
```

**Status:** ✅ MATCH  
**Required Action:** None - includes learning path validation

---

### 2.2 Load App Data

**Frontend Function:** `apiService.loadAppData()`  
**Backend Endpoint:** `GET /api/appdata`  
**HTTP Method:** GET  
**Request Payload:** None  
**Response Payload:**

```typescript
{
  appData: {
    email: string;
    moduleScores: object;
    completedLessons: object;
    // ... all fields
  } | null
}
```

**Status:** ✅ MATCH  
**Required Action:** None

---

### 2.3 Get All App Data (Admin)

**Frontend Function:** `apiService.getAllAppData()`  
**Backend Endpoint:** `GET /api/appdata/all`  
**HTTP Method:** GET  
**Request Payload:** None  
**Response Payload:**

```typescript
{
  appdata: Array<AppDataDoc>;
}
```

**Status:** ⚠️ ENDPOINT_MISSING  
**Required Action:** Backend does not have `/api/appdata/all` endpoint. Admin should use `GET /api/appdata/:uid` for specific users instead.

---

### 2.4 Get User App Data (Admin)

**Frontend Function:** Not implemented  
**Backend Endpoint:** `GET /api/appdata/:uid`  
**HTTP Method:** GET  
**Request Payload:** None (uid in URL params)  
**Response Payload:**

```typescript
{
  success: true;
  user: {
    firebaseUid: string;
    username: string;
    name: string;
    email: string;
    role: string;
  }
  appData: AppDataDoc | null;
}
```

**Status:** 🔄 UNUSED_BACKEND_ENDPOINT  
**Required Action:** Frontend should implement this for admin dashboard to view individual student progress

---

## 3. Scores Management

### 3.1 Save Score (Sync Service)

**Frontend Function:** `syncScore(payload, idToken)` in syncService.ts  
**Backend Endpoint:** `POST /api/sync/score` (INCORRECT)  
**Actual Backend Endpoint:** `POST /api/scores`  
**HTTP Method:** POST  
**Request Payload:**

```typescript
{
  studentUid: string;
  examId: string;
  score: number;
  maxScore: number;
  groupId?: string;
  meta?: object;
}
```

**Response Payload:**

```typescript
{
  success: true;
  score: {
    _id: string;
    studentUid: string;
    examId: string;
    score: number;
    maxScore: number;
    groupId?: string;
    createdAt: string;
    updatedAt: string;
  }
}
```

**Status:** ❌ PAYLOAD_MISMATCH  
**Required Action:**

1. Frontend calls `/api/sync/score` but backend expects `/api/scores`
2. Update `syncService.ts` to use correct endpoint: `POST /api/scores`

---

### 3.2 Get Scores

**Frontend Function:** Not implemented  
**Backend Endpoint:** `GET /api/scores`  
**HTTP Method:** GET  
**Request Payload:** Query params: studentUid, examId, groupId, limit, skip  
**Response Payload:**

```typescript
{
  success: true;
  scores: Array<Score>;
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  }
}
```

**Status:** 🔄 UNUSED_BACKEND_ENDPOINT  
**Required Action:** Frontend should implement score querying for admin dashboard and student progress views

---

## 4. Groups Management

### 4.1 Save Group

**Frontend Function:** `apiService.saveGroup(payload)`  
**Backend Endpoint:** `POST /api/groups`  
**HTTP Method:** POST  
**Request Payload:**

```typescript
{
  name: string;
  type: 'single' | 'multi';
  members: string[]; // Array of firebaseUids
  level?: number;
  description?: string;
}
```

**Response Payload:**

```typescript
{
  success: true;
  group: {
    id: string;
    name: string;
    type: string;
    members: string[];
    level: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }
}
```

**Status:** ⚠️ PAYLOAD_MISMATCH  
**Required Action:**

1. Frontend sends `{ id, name, level, members }` with User objects
2. Backend expects `{ name, type, members, level }` with firebaseUid strings
3. Frontend needs to transform User objects to firebaseUid strings
4. Frontend needs to add `type` field ('single' or 'multi')

---

### 4.2 Get Groups (Admin)

**Frontend Function:** Not directly called (uses polling via `watchGroups`)  
**Backend Endpoint:** `GET /api/groups`  
**HTTP Method:** GET  
**Request Payload:** Query params: type, level, limit, skip  
**Response Payload:**

```typescript
{
  success: true;
  groups: Array<Group>;
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  }
}
```

**Status:** ✅ MATCH (via polling)  
**Required Action:** Replace polling with Socket.io real-time updates

---

### 4.3 Get Group By ID

**Frontend Function:** `apiService.getGroupById(groupId)`  
**Backend Endpoint:** `GET /api/groups/:groupId`  
**HTTP Method:** GET  
**Request Payload:** None (groupId in URL)  
**Response Payload:**

```typescript
{
  group: Group;
}
```

**Status:** ⚠️ ENDPOINT_MISSING  
**Required Action:** Backend does not have individual group GET endpoint. Frontend should use `GET /api/groups` with filtering or backend should add this endpoint.

---

## 5. Messages & Files

### 5.1 Send Activity Message

**Frontend Function:** `syncActivityMessage(payload, idToken)` in syncService.ts  
**Backend Endpoint:** `POST /api/sync/activity-message` (INCORRECT)  
**Actual Backend Endpoint:** `POST /api/sync/activity/message`  
**HTTP Method:** POST  
**Request Payload:**

```typescript
{
  activityId: number;
  groupId: string;
  text: string;
}
```

**Response Payload:**

```typescript
{
  success: true;
  message: {
    _id: string;
    activityId: string;
    groupId: string;
    text: string;
    senderUid: string;
    createdAt: string;
  }
}
```

**Status:** ❌ PAYLOAD_MISMATCH  
**Required Action:**

1. Frontend calls `/api/sync/activity-message` but backend expects `/api/sync/activity/message`
2. Update `syncService.ts` endpoint path
3. Backend expects `activityId` as string, frontend sends number - needs type alignment

---

### 5.2 Get Activity Messages

**Frontend Function:** Not implemented  
**Backend Endpoint:** `GET /api/sync/activity/message`  
**HTTP Method:** GET  
**Request Payload:** Query params: activityId, groupId, limit, skip  
**Response Payload:**

```typescript
{
  success: true;
  messages: Array<Message>;
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  }
}
```

**Status:** 🔄 UNUSED_BACKEND_ENDPOINT  
**Required Action:** Frontend should implement message fetching instead of relying solely on Socket.io

---

### 5.3 Upload Activity File

**Frontend Function:** `syncActivityFile(payload, idToken)` in syncService.ts  
**Backend Endpoint:** `POST /api/sync/activity-file` (INCORRECT)  
**Actual Backend Endpoint:** `POST /api/sync/activity/file`  
**HTTP Method:** POST  
**Request Payload:**

```typescript
{
  activityId: number;
  groupId: string;
  filename: string;
  url: string;
  uploadedByUid: string;
}
```

**Response Payload:**

```typescript
{
  success: true;
  file: {
    _id: string;
    activityId: string;
    groupId: string;
    filename: string;
    url: string;
    uploadedByUid: string;
    createdAt: string;
  }
}
```

**Status:** ❌ PAYLOAD_MISMATCH  
**Required Action:**

1. Frontend calls `/api/sync/activity-file` but backend expects `/api/sync/activity/file`
2. Update `syncService.ts` endpoint path
3. Backend expects `activityId` as string, frontend sends number - needs type alignment

---

### 5.4 Get Activity Files

**Frontend Function:** Not implemented  
**Backend Endpoint:** `GET /api/sync/activity/file`  
**HTTP Method:** GET  
**Request Payload:** Query params: activityId, groupId, uploadedByUid, limit, skip  
**Response Payload:**

```typescript
{
  success: true;
  files: Array<ActivityFile>;
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  }
}
```

**Status:** 🔄 UNUSED_BACKEND_ENDPOINT  
**Required Action:** Frontend should implement file listing for activity pages

---

## 6. Login Tracking

### 6.1 Sync Login Time

**Frontend Function:** `syncLoginTime(payload, idToken)` in syncService.ts  
**Backend Endpoint:** `POST /api/sync/login` (INCORRECT)  
**Actual Backend Endpoint:** `POST /api/sync/login-time`  
**HTTP Method:** POST  
**Request Payload:**

```typescript
{
  firebaseUid: string;
}
```

**Response Payload:**

```typescript
{
  success: true;
  user: {
    _id: string;
    firebaseUid: string;
    username: string;
    loginTimes: string[];
    // ... other fields
  }
}
```

**Status:** ❌ PAYLOAD_MISMATCH  
**Required Action:**

1. Frontend calls `/api/sync/login` but backend expects `/api/sync/login-time`
2. Update `syncService.ts` endpoint path

---

### 6.2 Get Login Times (Admin)

**Frontend Function:** Not implemented  
**Backend Endpoint:** `GET /api/sync/login-times/:uid`  
**HTTP Method:** GET  
**Request Payload:** None (uid in URL params)  
**Response Payload:**

```typescript
{
  success: true;
  user: {
    firebaseUid: string;
    username: string;
    name: string;
    email: string;
    role: string;
  };
  loginTimes: string[]; // ISO 8601 dates
}
```

**Status:** 🔄 UNUSED_BACKEND_ENDPOINT  
**Required Action:** Frontend should implement login times viewing for admin dashboard

---

### 6.3 Record Login Event (Legacy)

**Frontend Function:** `apiService.recordLogin(payload)`  
**Backend Endpoint:** `POST /api/loginEvent`  
**HTTP Method:** POST  
**Request Payload:**

```typescript
{
  name: string;
  email: string;
  userAgent?: string;
}
```

**Response Payload:**

```typescript
{
  message: string;
  data: LoginEventDoc;
}
```

**Status:** ⚠️ DUPLICATE_FUNCTIONALITY  
**Required Action:** This duplicates `/api/sync/login-time`. Frontend should consolidate to use only `/api/sync/login-time`

---

### 6.4 Get Login Events (Legacy)

**Frontend Function:** `apiService.getLoginEvents()`  
**Backend Endpoint:** `GET /api/loginEvents`  
**HTTP Method:** GET  
**Request Payload:** None  
**Response Payload:**

```typescript
{
  events: Array<LoginEventDoc>;
}
```

**Status:** ⚠️ DUPLICATE_FUNCTIONALITY  
**Required Action:** This duplicates `/api/sync/login-times/:uid`. Frontend should consolidate to use only `/api/sync/login-times/:uid`

---

## 7. Activities & Submissions

### 7.1 Record Activity

**Frontend Function:** `apiService.recordActivity(payload)`  
**Backend Endpoint:** `POST /api/activities`  
**HTTP Method:** POST  
**Request Payload:**

```typescript
{
  action: string;
  description: string;
  moduleId?: number;
  score?: any;
}
```

**Response Payload:**

```typescript
{
  // Response format not documented in backend
}
```

**Status:** ⚠️ ENDPOINT_MISSING  
**Required Action:** Backend does not have `/api/activities` POST endpoint. This functionality is embedded in `/api/appdata` POST. Frontend should remove this call or backend should add dedicated endpoint.

---

### 7.2 Watch Activities (Polling)

**Frontend Function:** `apiService.watchActivities(callback)`  
**Backend Endpoint:** `GET /api/activities`  
**HTTP Method:** GET  
**Request Payload:** None  
**Response Payload:**

```typescript
{
  activities: Array<Activity>;
}
```

**Status:** ⚠️ ENDPOINT_MISSING  
**Required Action:** Backend does not have `/api/activities` GET endpoint. Frontend polling will fail. Backend should add this endpoint or frontend should remove polling.

---

### 7.3 Upload File Submission

**Frontend Function:** `apiService.uploadFile(fileData)` and direct fetch to `/api/submissions`  
**Backend Endpoint:** `POST /api/submissions`  
**HTTP Method:** POST  
**Request Payload:**

```typescript
{
  name: string;
  type: string;
  data: string; // base64
  moduleId?: number;
  activityId?: number;
}
```

**Response Payload:**

```typescript
{
  url: string;
  fileId: string;
}
```

**Status:** ⚠️ ENDPOINT_MISSING  
**Required Action:** Backend does not have `/api/submissions` endpoint. Frontend should use `/api/sync/activity/file` instead for file metadata after uploading to storage.

---

### 7.4 Get My Submissions

**Frontend Function:** `apiService.getMySubmissions()`  
**Backend Endpoint:** `GET /api/submissions`  
**HTTP Method:** GET  
**Request Payload:** None  
**Response Payload:**

```typescript
{
  submissions: Array<Submission>;
}
```

**Status:** ⚠️ ENDPOINT_MISSING  
**Required Action:** Backend does not have `/api/submissions` GET endpoint. Use `/api/sync/activity/file` instead.

---

### 7.5 Download File

**Frontend Function:** `apiService.downloadFile(fileId)`  
**Backend Endpoint:** `GET /api/files/:fileId`  
**HTTP Method:** GET  
**Request Payload:** None (fileId in URL)  
**Response Payload:** Blob  
**Status:** ⚠️ ENDPOINT_MISSING  
**Required Action:** Backend does not have `/api/files/:fileId` endpoint. Files should be accessed via URLs stored in ActivityFile documents.

---

## 8. Admin Endpoints

### 8.1 Broadcast Exam Update

**Frontend Function:** Not implemented  
**Backend Endpoint:** `POST /api/admin/exam`  
**HTTP Method:** POST  
**Request Payload:**

```typescript
{
  examId: string;
  title: string;
  duration: number;
  questions: Array<Question>;
  // ... other exam fields
}
```

**Response Payload:**

```typescript
{
  success: true;
  message: string;
  exam: object;
}
```

**Status:** 🔄 UNUSED_BACKEND_ENDPOINT  
**Required Action:** Frontend should implement admin exam management UI to use this endpoint

---

### 8.2 Broadcast News Update

**Frontend Function:** Not implemented  
**Backend Endpoint:** `POST /api/admin/news`  
**HTTP Method:** POST  
**Request Payload:**

```typescript
{
  newsId: string;
  title: string;
  content: string;
  author: string;
  publishedAt: string;
}
```

**Response Payload:**

```typescript
{
  success: true;
  message: string;
  news: object;
}
```

**Status:** 🔄 UNUSED_BACKEND_ENDPOINT  
**Required Action:** Frontend should implement admin news management to broadcast updates via Socket.io

---

## 9. Real-Time Polling (Should be replaced with Socket.io)

### 9.1 Watch Students (Polling)

**Frontend Function:** `apiService.watchStudents(callback)` - polls every 10s  
**Backend Endpoint:** `GET /api/users`  
**HTTP Method:** GET  
**Status:** 🔄 REALTIME_REPLACEMENT  
**Required Action:** Replace with Socket.io connection and listen for user updates

---

### 9.2 Watch Groups (Polling)

**Frontend Function:** `apiService.watchGroups(callback)` - polls every 15s  
**Backend Endpoint:** `GET /api/groups`  
**HTTP Method:** GET  
**Status:** 🔄 REALTIME_REPLACEMENT  
**Required Action:** Replace with Socket.io `group:updated` event listener

---

### 9.3 Watch Activities (Polling)

**Frontend Function:** `apiService.watchActivities(callback)` - polls every 10s  
**Backend Endpoint:** `GET /api/activities` (MISSING)  
**HTTP Method:** GET  
**Status:** ⚠️ ENDPOINT_MISSING + REALTIME_REPLACEMENT  
**Required Action:** Backend needs to add endpoint OR remove frontend polling entirely

---

### 9.4 Watch Student By Email (Polling)

**Frontend Function:** `apiService.watchStudentByEmail(email, callback)` - polls every 10s  
**Backend Endpoint:** `POST /api/profile`  
**HTTP Method:** POST  
**Status:** 🔄 REALTIME_REPLACEMENT  
**Required Action:** Replace with Socket.io or remove polling if not needed

---

## 10. Health Check

### 10.1 Check Backend Health

**Frontend Function:** `apiService.checkHealth()`  
**Backend Endpoint:** `GET /api/health`  
**HTTP Method:** GET  
**Request Payload:** None  
**Response Payload:**

```typescript
{
  status: string;
  message: string;
  database: string;
}
```

**Status:** ✅ MATCH  
**Required Action:** None

---

## Summary Statistics

| Status                     | Count | Description                                  |
| -------------------------- | ----- | -------------------------------------------- |
| ✅ MATCH                   | 7     | Endpoint exists and matches perfectly        |
| ❌ PAYLOAD_MISMATCH        | 5     | Endpoint path or payload structure mismatch  |
| ⚠️ ENDPOINT_MISSING        | 8     | Frontend calls non-existent backend endpoint |
| 🔄 UNUSED_BACKEND_ENDPOINT | 5     | Backend endpoint not used by frontend        |
| 🔄 REALTIME_REPLACEMENT    | 4     | Polling should be replaced with Socket.io    |
| ⚠️ DUPLICATE_FUNCTIONALITY | 2     | Multiple endpoints for same functionality    |

---

## Critical Issues Requiring Immediate Attention

### Priority 1: Endpoint Path Mismatches

1. **Score Sync**: Frontend calls `/api/sync/score` → Should be `/api/scores`
2. **Login Time Sync**: Frontend calls `/api/sync/login` → Should be `/api/sync/login-time`
3. **Activity Message**: Frontend calls `/api/sync/activity-message` → Should be `/api/sync/activity/message`
4. **Activity File**: Frontend calls `/api/sync/activity-file` → Should be `/api/sync/activity/file`

### Priority 2: Missing Backend Endpoints

1. `/api/appdata/all` - Used by admin to get all user data
2. `/api/activities` (GET/POST) - Used for activity tracking
3. `/api/submissions` (GET/POST) - Used for file submissions
4. `/api/files/:fileId` - Used for file downloads
5. `/api/groups/:groupId` - Used to get individual group

### Priority 3: Type Mismatches

1. **activityId**: Backend expects string, frontend sends number
2. **Group members**: Backend expects firebaseUid strings, frontend sends User objects
3. **Group type**: Backend requires 'single' | 'multi', frontend doesn't send this field

### Priority 4: Polling to Real-Time Migration

1. Replace `watchStudents` polling with Socket.io
2. Replace `watchGroups` polling with Socket.io `group:updated` listener
3. Replace `watchActivities` polling (or remove if endpoint doesn't exist)
4. Replace `watchStudentByEmail` polling (or remove if not needed)

---

## Recommendations

1. **Create a unified sync service** that handles all endpoint path corrections
2. **Add type transformers** to convert frontend types to backend-expected formats
3. **Implement Socket.io connection** to replace all polling mechanisms
4. **Add missing backend endpoints** or remove frontend calls to non-existent endpoints
5. **Consolidate duplicate functionality** (login tracking, activity recording)
6. **Add comprehensive error handling** for all API calls
7. **Implement retry logic** for failed requests
8. **Add request/response logging** for debugging

---

_Report Generated: December 13, 2025_
