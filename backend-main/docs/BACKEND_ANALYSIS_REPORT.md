# Backend Architecture Analysis Report

## Executive Summary

This backend is a **TypeScript/Express.js** application using **MongoDB** for data persistence and **Firebase Admin SDK** for authentication. The architecture is functional but has several areas requiring attention:

- ✅ **Working**: User authentication, basic CRUD operations, login tracking
- ⚠️ **Partial**: Group chat (no real-time), file metadata storage (no actual uploads)
- ❌ **Missing**: Real-time updates, input validation, comprehensive admin APIs, learning path validation

---

## 1. Project Architecture

### Technologies Stack

- **Runtime**: Node.js 25.x
- **Language**: TypeScript 5.9.3
- **Framework**: Express.js 4.21.2
- **Database**: MongoDB 6.21.0 via Mongoose 9.0.0
- **Authentication**: Firebase Admin SDK 12.0.0
- **CORS**: Configured for localhost:3000 and localhost:5173

### Project Structure

```
backend/
├── server.ts              # Main entry point (inline routes + models)
├── models/                # Organized model definitions
│   ├── User.ts           # User model with firebaseUid
│   ├── Score.ts          # Exam scores
│   ├── Activity.ts       # File metadata
│   ├── Message.ts        # Chat messages
│   └── index.ts          # Barrel exports
├── routes/
│   └── sync.ts           # New sync endpoints
├── scripts/
│   └── seedUsers.ts      # Seed admin/student users
└── package.json
```

### Authentication Mechanism

**Firebase ID Token Verification**:

1. Frontend obtains Firebase ID token after user authentication
2. Token sent in `Authorization: Bearer <token>` header
3. Backend calls `admin.auth().verifyIdToken(token)`
4. Decoded token provides user info (uid, email, name)
5. Admin access controlled by matching `decoded.email` with `ADMIN_EMAIL` env variable

---

## 2. Firebase Admin SDK Usage

### Initialization

- **File**: `server.ts` lines 68-84
- **Method**: Loads service account JSON and calls `admin.initializeApp()`
- **Firestore**: Initialized (`getFirestore()`) but **NOT USED** - all data operations use MongoDB

### Token Verification Locations

| Endpoint             | File              | Purpose                    |
| -------------------- | ----------------- | -------------------------- |
| POST /api/loginEvent | server.ts:189     | Record login event         |
| GET /api/loginEvents | server.ts:232     | Fetch login events (admin) |
| POST /api/users      | server.ts:276     | Create/update user         |
| GET /api/users       | server.ts:364     | Get all users (admin)      |
| POST /api/appdata    | server.ts:446     | Save app state             |
| GET /api/appdata     | server.ts:599     | Get app state              |
| POST /api/profile    | server.ts:635     | Get user profile           |
| All /api/sync/\*     | routes/sync.ts:19 | Sync endpoints middleware  |

---

## 3. API Endpoints Mapping

### Public Endpoints (No Auth)

| Method | Path         | Purpose                     |
| ------ | ------------ | --------------------------- |
| GET    | /api/health  | Health check + DB status    |
| POST   | /api/addData | Test endpoint (echoes data) |

### Authenticated Endpoints

| Method | Path             | Auth | Admin Only | Purpose                 |
| ------ | ---------------- | ---- | ---------- | ----------------------- |
| POST   | /api/loginEvent  | ✅   | ❌         | Record login event      |
| GET    | /api/loginEvents | ✅   | ✅         | Get recent login events |
| POST   | /api/users       | ✅   | ❌         | Create/update user      |
| GET    | /api/users       | ✅   | ✅         | Get all students        |
| POST   | /api/appdata     | ✅   | ❌         | Save complete app state |
| GET    | /api/appdata     | ✅   | ❌         | Get app state           |
| POST   | /api/profile     | ✅   | ❌         | Get user profile        |

### New Sync Endpoints (routes/sync.ts)

| Method | Path                  | Purpose                      | Status          |
| ------ | --------------------- | ---------------------------- | --------------- |
| POST   | /api/sync/user        | Upsert user with firebaseUid | ✅ Working      |
| POST   | /api/sync/login-time  | Record login timestamp       | ✅ Working      |
| POST   | /api/scores           | Save exam score              | ✅ Working      |
| POST   | /api/activity/file    | Save file metadata           | ✅ Working      |
| POST   | /api/activity/message | Save message                 | ⚠️ No real-time |

---

## 4. Data Models

### Organized Models (models/ directory)

#### User (models/User.ts)

```typescript
{
  firebaseUid: String (unique, indexed)
  username: String (auto-normalized: trim+lowercase)
  email: String (unique, indexed)
  profile: Mixed
  role: 'admin' | 'student' | 'teacher'
  loginTimes: Date[]
  createdAt, updatedAt: Date (auto)
}
```

**Purpose**: Structured user model for sync endpoints

#### Score (models/Score.ts)

```typescript
{
  studentUid: String (indexed)
  examId: String (indexed)
  score: Number
  maxScore: Number
  groupId: String (optional, indexed)
  meta: Mixed
  createdAt, updatedAt: Date (auto)
}
```

**Purpose**: Store exam/quiz scores
**Index**: Compound index on (studentUid, examId)

#### ActivityFile (models/Activity.ts)

```typescript
{
  activityId: String (indexed)
  filename: String
  url: String
  uploadedByUid: String (indexed)
  createdAt, updatedAt: Date (auto)
}
```

**Purpose**: Store file metadata (not actual files)

#### Message (models/Message.ts)

```typescript
{
  activityId: String (indexed)
  text: String
  senderUid: String (indexed)
  createdAt, updatedAt: Date (auto)
}
```

**Purpose**: Store chat messages

### Inline Models (server.ts)

#### LoginEvent

```typescript
{
  name: String;
  email: String;
  userAgent: String;
  ip: String;
  timestamp: Date;
}
```

**Purpose**: Track login events with IP/user agent

#### UserModel (DUPLICATE!)

```typescript
{
  name: String
  email: String (unique)
  avatar: String
  role: String (default: 'student')
  createdAt, updatedAt: Date (auto)
}
```

⚠️ **WARNING**: This overlaps with models/User.ts - potential conflict!

#### StudentModel

```typescript
{
  email: String (unique)
  name: String
  avatar: String
  registeredAt: Date
  lastActivityAt: Date
  status: String (default: 'active')
  createdAt, updatedAt: Date (auto)
}
```

**Purpose**: Student-specific data with activity tracking

#### AppDataModel

```typescript
{
  email: String (unique)
  moduleScores: Mixed
  completedLessons: Mixed
  finalQuizPassed: Boolean
  unlockedModules: Number[]
  currentActivityId: Number
  currentModuleId: Number
  moduleLessonIndex: Number
  modulePageIndex: Number
  learningPathTopic: String
  groups: Mixed[]
  discussions: Mixed[]
  newsItems: Mixed[]
  createdAt, updatedAt: Date (auto)
}
```

**Purpose**: Store complete app state per user

#### ActivityModel (dynamically created)

```typescript
{
  userEmail: String;
  userName: String;
  action: String;
  description: String;
  timestamp: Date;
  moduleId: Number;
  score: Mixed;
}
```

**Purpose**: Track user activities (created in /api/appdata)

#### GroupModel (dynamically created)

```typescript
{
  id: String
  name: String
  level: Number
  members: Mixed
  createdAt, updatedAt: Date
}
```

**Purpose**: Store groups (created in /api/appdata)

---

## 5. Application Flows

### Authentication Flow

```
1. User signs in with Firebase Auth (frontend)
2. Frontend obtains Firebase ID token
3. Frontend sends token in Authorization header
4. Backend calls admin.auth().verifyIdToken(token)
5. If valid → proceed with request
6. If invalid → return 401 Unauthorized
7. Admin check: decoded.email === ADMIN_EMAIL
```

### User Registration/Login Flow

```
1. User signs in via Firebase Auth
2. Frontend calls POST /api/users (or /api/sync/user)
3. Backend upserts to UserModel + StudentModel
4. Frontend calls POST /api/loginEvent
5. Backend saves LoginEvent with IP/user agent
6. (Optional) Frontend calls POST /api/sync/login-time
```

### Quiz/Exam Score Flow

```
1. Student completes quiz
2. Frontend calls POST /api/scores
3. Backend saves to Score collection
4. Frontend calls POST /api/appdata with moduleScores
5. Backend saves to AppDataModel
6. If finalQuizPassed=true → creates Activity record
```

⚠️ **Gap**: No endpoint to query scores for admin dashboard

### File Upload Flow

```
1. Frontend uploads file to external storage (NOT IN BACKEND)
2. Frontend obtains file URL
3. Frontend calls POST /api/activity/file with metadata
4. Backend saves metadata to ActivityFile collection
```

⚠️ **Gap**: Backend does not handle actual file uploads

### Chat/Collaboration Flow

```
1. Frontend calls POST /api/activity/message
2. Backend saves to Message collection
3. Backend returns success (NO BROADCASTING)
4. Frontend must poll for new messages
```

⚠️ **Gaps**:

- No Socket.io for real-time
- No group membership validation
- No GET endpoint to retrieve messages

### Admin Dashboard Flow

```
1. Admin logs in with Firebase Auth
2. Admin calls GET /api/users (all students)
3. Admin calls GET /api/loginEvents (recent logins)
4. Admin calls GET /api/appdata (individual user data)
```

⚠️ **Gaps**:

- No endpoint to get all groups
- No endpoint to get all scores
- No endpoint to get messages/files
- No real-time updates

---

## 6. Weak Points & Bottlenecks

### 🔴 CRITICAL Issues

1. **Service Account JSON in Repository**

   - File: `adaptive-collaborative-learn-firebase-adminsdk-fbsvc-baa1399a32.json`
   - Now in .gitignore but may be in git history
   - **Action**: Remove from history, rotate credentials

2. **No Input Validation**
   - All endpoints accept raw user input
   - Vulnerable to injection attacks
   - **Action**: Add validation library (Joi, express-validator)

### 🟠 HIGH Priority Issues

3. **Model Duplication**

   - Two User models: UserModel (server.ts) and User (models/User.ts)
   - Both use 'users' collection
   - **Action**: Consolidate to single model

4. **No Real-time Communication**

   - Messages saved but not broadcast
   - Admin dashboard cannot see live updates
   - **Action**: Implement Socket.io

5. **No Tests**
   - Zero unit or integration tests
   - **Action**: Add Jest/Mocha test suite

### 🟡 MEDIUM Priority Issues

6. **No Transactions**

   - Multi-collection updates not atomic
   - Example: /api/users updates UserModel + StudentModel separately
   - **Action**: Use MongoDB transactions

7. **Inline Model Definitions**

   - ActivityModel, GroupModel created dynamically in handlers
   - **Action**: Move to models/ directory

8. **No Rate Limiting**

   - Vulnerable to DoS attacks
   - **Action**: Add express-rate-limit

9. **Admin Access Control**

   - Relies on single ADMIN_EMAIL env variable
   - No proper RBAC
   - **Action**: Implement role-based access control

10. **Missing CRUD Endpoints**

    - Score, Message, ActivityFile only have CREATE
    - No READ/UPDATE/DELETE operations
    - **Action**: Add complete CRUD APIs

11. **Embedded Arrays in AppDataModel**
    - groups, discussions, newsItems as embedded arrays
    - Difficult to query and scale
    - **Action**: Normalize with separate collections

### 🟢 LOW Priority Issues

12. **No Pagination**

    - GET /api/users returns up to 1000 users
    - GET /api/loginEvents returns 100 events
    - **Action**: Add pagination support

13. **No Caching**

    - No caching layer for hot data
    - **Action**: Add Redis caching

14. **Inconsistent Response Formats**

    - Some return { success, data }, others { message, data }
    - **Action**: Standardize API responses

15. **No API Documentation**
    - Only API_SYNC_ENDPOINTS.md for new endpoints
    - **Action**: Add Swagger/OpenAPI docs

---

## 7. Requirements Gap Analysis

### ✅ Requirement 1: Save new user into Mongo and show in admin dashboard

**Status**: SUPPORTED

- POST /api/users and POST /api/sync/user save users
- GET /api/users retrieves all students for admin
- **Gap**: Two different endpoints may cause confusion

### ⚠️ Requirement 2: Normalize username on login/register

**Status**: PARTIALLY SUPPORTED

- models/User.ts normalizes username (trim + lowercase)
- POST /api/users does NOT normalize (uses 'name' field)
- Only POST /api/sync/user normalizes
- **Gap**: Inconsistency between endpoints
- **Recommendation**: Consolidate to single endpoint

### ✅ Requirement 3: Save exam scores & learning path to Mongo

**Status**: SUPPORTED

- POST /api/scores saves individual scores
- POST /api/appdata saves moduleScores, learningPathTopic, etc.
- **Gaps**:
  - No endpoint to query scores by examId
  - No endpoint to get learning path progress for admin
  - No validation logic (see Requirement 7)

### ⚠️ Requirement 4: Group-based chat + file upload in admin panel

**Status**: PARTIALLY SUPPORTED

- POST /api/activity/message saves messages
- POST /api/activity/file saves file metadata
- Groups stored in AppDataModel.groups
- **Gaps**:
  - No GET /api/messages/:activityId
  - No GET /api/files/:activityId
  - No GET /api/groups
  - No real-time updates (Socket.io missing)
  - No group membership validation
  - File upload only metadata, not actual files

### ❌ Requirement 5: Admin selecting only ONE member when creating group

**Status**: NOT SUPPORTED

- No dedicated POST /api/groups endpoint
- Groups created via POST /api/appdata with arbitrary members
- No validation on member count
- **Recommendation**: Create POST /api/groups with validation: `members.length === 1`

### ✅ Requirement 6: Save login times for admin dashboard

**Status**: SUPPORTED

- POST /api/loginEvent saves login events
- POST /api/sync/login-time saves to User.loginTimes array
- GET /api/loginEvents retrieves events for admin
- **Gap**: Two different mechanisms (LoginEvent vs User.loginTimes)
- **Recommendation**: Consolidate to single mechanism

### ❌ Requirement 7: Validate learning path logic

**Status**: NOT SUPPORTED

- AppDataModel stores learning path data
- No validation logic in backend
- No prerequisite checking
- No module progression validation
- All validation must be done in frontend (insecure)
- **Recommendation**: Add middleware/service layer to validate:
  - Prerequisites completed before unlocking modules
  - Module progression order
  - Quiz scores before marking lessons complete

### ❌ Requirement 8: Admin changes appear for students in real-time

**Status**: NOT SUPPORTED

- No Socket.io integration
- No WebSocket connections
- No server-sent events (SSE)
- Students must poll or refresh
- **Recommendation**: Implement Socket.io with:
  - User/group rooms
  - Event emission on admin changes
  - Real-time message broadcasting

---

## 8. Environment Variables

| Variable    | Required | Default | Purpose                   |
| ----------- | -------- | ------- | ------------------------- |
| MONGO_URI   | ✅ Yes   | -       | MongoDB connection string |
| PORT        | ❌ No    | 5001    | Server port               |
| ADMIN_EMAIL | ✅ Yes   | -       | Admin access control      |
| NODE_ENV    | ❌ No    | -       | Environment mode          |

---

## 9. Run Commands

```bash
# Install dependencies
npm install

# Development (auto-restart)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Seed admin + student users
npm run seed:users

# Test MongoDB connection
npm run test-connect
```

---

## 10. Recommendations Summary

### Immediate Actions (Critical)

1. ✅ Remove service account JSON from git history, rotate credentials
2. ✅ Add input validation to all endpoints
3. ✅ Consolidate duplicate User models
4. ✅ Add unit and integration tests

### Short-term (High Priority)

5. ✅ Implement Socket.io for real-time updates
6. ✅ Add missing CRUD endpoints (GET messages, GET files, GET groups, etc.)
7. ✅ Implement learning path validation logic
8. ✅ Add group creation endpoint with member count validation
9. ✅ Use MongoDB transactions for multi-collection operations

### Medium-term

10. ✅ Implement proper RBAC system
11. ✅ Add rate limiting
12. ✅ Normalize AppDataModel (separate collections for groups, discussions)
13. ✅ Add centralized error handling middleware
14. ✅ Standardize API response formats

### Long-term

15. ✅ Add pagination to list endpoints
16. ✅ Implement caching layer (Redis)
17. ✅ Add Swagger/OpenAPI documentation
18. ✅ Implement actual file upload handling (not just metadata)

---

**Report Generated**: December 12, 2024  
**Analysis Type**: Read-only (no code modifications)
