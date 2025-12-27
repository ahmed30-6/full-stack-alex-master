# API Reference

## Overview

Complete API reference for the Adaptive Collaborative Learning Platform backend. This document covers all endpoints, authentication, request/response formats, and error handling.

## Table of Contents

1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Scores & Learning Path](#scores--learning-path)
4. [Groups](#groups)
5. [Messages & Files](#messages--files)
6. [Login Tracking](#login-tracking)
7. [Admin Endpoints](#admin-endpoints)
8. [Real-Time Events](#real-time-events)
9. [Error Handling](#error-handling)
10. [Rate Limiting](#rate-limiting)

---

## Authentication

All API endpoints require Firebase authentication unless otherwise specified.

### Authentication Header

```http
Authorization: Bearer <firebase-id-token>
```

### Getting a Token

```javascript
// Client-side (Firebase)
const token = await firebase.auth().currentUser.getIdToken();

// Use in requests
fetch("/api/endpoint", {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});
```

### Token Verification

- Tokens are verified using Firebase Admin SDK
- Expired tokens return `401 Unauthorized`
- Invalid tokens return `401 Unauthorized`

---

## User Management

### POST /api/sync/user

Create or update a user.

**Authentication:** Required

**Request Body:**

```json
{
  "firebaseUid": "string (required)",
  "username": "string (required)",
  "email": "string (required)",
  "profile": {
    "name": "string",
    "avatar": "string"
  },
  "role": "student | admin"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "_id": "string",
    "firebaseUid": "string",
    "username": "string",
    "email": "string",
    "profile": {},
    "role": "string",
    "loginTimes": [],
    "createdAt": "ISO 8601 date",
    "updatedAt": "ISO 8601 date"
  }
}
```

**Notes:**

- Username is automatically normalized (lowercase, trimmed)
- Creates new user if doesn't exist
- Updates existing user if exists

### GET /api/users

Get all users (admin only).

**Authentication:** Required (Admin)

**Query Parameters:**

- `role` (optional): Filter by role (`student` | `admin`)
- `limit` (optional): Results per page (default: 100, max: 1000)
- `skip` (optional): Number of results to skip (default: 0)

**Response:**

```json
{
  "success": true,
  "users": [
    {
      "_id": "string",
      "firebaseUid": "string",
      "username": "string",
      "email": "string",
      "role": "string",
      "createdAt": "ISO 8601 date"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 100,
    "skip": 0,
    "hasMore": true
  }
}
```

---

## Scores & Learning Path

### POST /api/scores

Save a score.

**Authentication:** Required

**Request Body:**

```json
{
  "studentUid": "string (required)",
  "examId": "string (required)",
  "score": "number (required)",
  "maxScore": "number (required)",
  "groupId": "string (optional)",
  "meta": {
    "attempts": "number",
    "timeSpent": "number"
  }
}
```

**Response:**

```json
{
  "success": true,
  "score": {
    "_id": "string",
    "studentUid": "string",
    "examId": "string",
    "score": 85,
    "maxScore": 100,
    "groupId": "string",
    "meta": {},
    "createdAt": "ISO 8601 date",
    "updatedAt": "ISO 8601 date"
  }
}
```

**Notes:**

- If `examId` matches pattern `module-X-*`, automatically updates `AppDataModel.moduleScores`
- Calculates percentage and stores completion timestamp

### GET /api/scores

Query scores with filters.

**Authentication:** Required

**Authorization:**

- Students can only view their own scores
- Admins can view all scores

**Query Parameters:**

- `studentUid` (optional): Filter by student Firebase UID
- `examId` (optional): Filter by exam ID
- `groupId` (optional): Filter by group ID
- `limit` (optional): Results per page (default: 100, max: 1000)
- `skip` (optional): Number of results to skip (default: 0)

**Response:**

```json
{
  "success": true,
  "scores": [
    {
      "_id": "string",
      "studentUid": "string",
      "examId": "string",
      "score": 85,
      "maxScore": 100,
      "groupId": "string",
      "createdAt": "ISO 8601 date"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 100,
    "skip": 0,
    "hasMore": true
  }
}
```

### GET /api/appdata

Get learning path for current user.

**Authentication:** Required

**Response:**

```json
{
  "appData": {
    "email": "string",
    "moduleScores": {
      "1": {
        "score": 85,
        "maxScore": 100,
        "percentage": 85,
        "examId": "module-1-final",
        "completedAt": "ISO 8601 date"
      }
    },
    "completedLessons": {
      "1": true,
      "2": true
    },
    "finalQuizPassed": false,
    "unlockedModules": [1, 2],
    "currentActivityId": 5,
    "currentModuleId": 2,
    "moduleLessonIndex": 3,
    "modulePageIndex": 0,
    "learningPathTopic": "string",
    "groups": [],
    "discussions": [],
    "newsItems": []
  }
}
```

### POST /api/appdata

Update learning path data.

**Authentication:** Required

**Request Body:**

```json
{
  "moduleScores": {},
  "completedLessons": {},
  "finalQuizPassed": false,
  "unlockedModules": [1, 2],
  "currentModuleId": 2,
  "moduleLessonIndex": 0
}
```

**Validation Rules:**

- Module 1 is always unlocked
- Module N requires Module N-1 completed with >= 60% score
- Modules must be unlocked sequentially: [1], [1,2], [1,2,3]
- Cannot skip modules
- Lessons can only be completed in unlocked modules

**Response:**

```json
{
  "appData": {
    /* updated learning path */
  }
}
```

**Error Response (Validation Failed):**

```json
{
  "success": false,
  "error": "Learning path validation failed",
  "details": [
    "Cannot unlock module 3: Module 2 has not been completed",
    "Invalid module sequence: expected module 2, found 3"
  ]
}
```

### GET /api/appdata/:uid

Get learning path for specific user (admin only).

**Authentication:** Required (Admin)

**URL Parameters:**

- `uid`: Student's Firebase UID

**Response:**

```json
{
  "success": true,
  "user": {
    "firebaseUid": "string",
    "username": "string",
    "name": "string",
    "email": "string",
    "role": "string"
  },
  "appData": {
    /* learning path data */
  }
}
```

---

## Groups

### POST /api/groups

Create a new group (admin only).

**Authentication:** Required (Admin)

**Request Body:**

```json
{
  "name": "string (required)",
  "type": "single | multi (required)",
  "members": ["firebaseUid1", "firebaseUid2"],
  "level": "number (optional)"
}
```

**Validation:**

- Single-type groups must have exactly one member
- Multi-type groups must have at least one member

**Response:**

```json
{
  "success": true,
  "group": {
    "id": "string",
    "name": "string",
    "type": "single",
    "members": ["firebaseUid"],
    "level": 1,
    "createdBy": "string",
    "createdAt": "ISO 8601 date",
    "updatedAt": "ISO 8601 date"
  }
}
```

**Real-Time Event:** Emits `group:updated` to group members

### GET /api/groups

Get all groups (admin only).

**Authentication:** Required (Admin)

**Query Parameters:**

- `type` (optional): Filter by type (`single` | `multi`)
- `level` (optional): Filter by level
- `limit` (optional): Results per page (default: 100)
- `skip` (optional): Number of results to skip (default: 0)

**Response:**

```json
{
  "success": true,
  "groups": [
    {
      "_id": "string",
      "name": "string",
      "type": "single",
      "members": ["firebaseUid"],
      "level": 1,
      "createdBy": "string",
      "createdAt": "ISO 8601 date"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 100,
    "skip": 0,
    "hasMore": false
  }
}
```

---

## Messages & Files

### POST /api/sync/activity/message

Send a message to a group.

**Authentication:** Required

**Authorization:** User must be a member of the group

**Request Body:**

```json
{
  "activityId": "string (required)",
  "groupId": "string (required)",
  "text": "string (required)"
}
```

**Response:**

```json
{
  "success": true,
  "message": {
    "_id": "string",
    "activityId": "string",
    "groupId": "string",
    "text": "string",
    "senderUid": "string",
    "createdAt": "ISO 8601 date",
    "updatedAt": "ISO 8601 date"
  }
}
```

**Real-Time Event:** Emits `message:new` to group members

### GET /api/sync/activity/message

Get messages with group filtering.

**Authentication:** Required

**Authorization:** Only returns messages from user's groups

**Query Parameters:**

- `activityId` (optional): Filter by activity ID
- `groupId` (optional): Filter by group ID
- `limit` (optional): Results per page (default: 100)
- `skip` (optional): Number of results to skip (default: 0)

**Response:**

```json
{
  "success": true,
  "messages": [
    {
      "_id": "string",
      "activityId": "string",
      "groupId": "string",
      "text": "string",
      "senderUid": "string",
      "createdAt": "ISO 8601 date"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 100,
    "skip": 0,
    "hasMore": false
  }
}
```

### POST /api/sync/activity/file

Upload file metadata.

**Authentication:** Required

**Authorization:** User must be a member of the group

**Request Body:**

```json
{
  "activityId": "string (required)",
  "groupId": "string (required)",
  "filename": "string (required)",
  "url": "string (required)",
  "uploadedByUid": "string (required)"
}
```

**Response:**

```json
{
  "success": true,
  "file": {
    "_id": "string",
    "activityId": "string",
    "groupId": "string",
    "filename": "string",
    "url": "string",
    "uploadedByUid": "string",
    "createdAt": "ISO 8601 date",
    "updatedAt": "ISO 8601 date"
  }
}
```

### GET /api/sync/activity/file

Get files with group filtering.

**Authentication:** Required

**Authorization:** Only returns files from user's groups

**Query Parameters:**

- `activityId` (optional): Filter by activity ID
- `groupId` (optional): Filter by group ID
- `uploadedByUid` (optional): Filter by uploader
- `limit` (optional): Results per page (default: 100)
- `skip` (optional): Number of results to skip (default: 0)

**Response:**

```json
{
  "success": true,
  "files": [
    {
      "_id": "string",
      "activityId": "string",
      "groupId": "string",
      "filename": "string",
      "url": "string",
      "uploadedByUid": "string",
      "createdAt": "ISO 8601 date"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 100,
    "skip": 0,
    "hasMore": false
  }
}
```

---

## Login Tracking

### POST /api/sync/login-time

Record a login timestamp.

**Authentication:** Required

**Request Body:**

```json
{
  "firebaseUid": "string (required)"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "_id": "string",
    "firebaseUid": "string",
    "username": "string",
    "loginTimes": ["ISO 8601 date", "ISO 8601 date"]
  }
}
```

### GET /api/sync/login-times/:uid

Get login times for a user (admin only).

**Authentication:** Required (Admin)

**URL Parameters:**

- `uid`: User's Firebase UID

**Response:**

```json
{
  "success": true,
  "user": {
    "firebaseUid": "string",
    "username": "string",
    "name": "string",
    "email": "string",
    "role": "string"
  },
  "loginTimes": ["2024-12-13T10:00:00.000Z", "2024-12-13T14:30:00.000Z"]
}
```

**Notes:**

- Login times are returned in chronological order
- Only admin can view other users' login times

---

## Admin Endpoints

### POST /api/admin/exam

Broadcast exam update to all students.

**Authentication:** Required (Admin)

**Request Body:**

```json
{
  "examId": "string",
  "title": "string",
  "duration": "number",
  "questions": []
}
```

**Response:**

```json
{
  "success": true,
  "message": "Exam updated and broadcast to all students",
  "exam": {
    /* exam data */
  }
}
```

**Real-Time Event:** Emits `exam:updated` to all connected clients

### POST /api/admin/news

Broadcast news update to all students.

**Authentication:** Required (Admin)

**Request Body:**

```json
{
  "newsId": "string",
  "title": "string",
  "content": "string",
  "author": "string",
  "publishedAt": "ISO 8601 date"
}
```

**Response:**

```json
{
  "success": true,
  "message": "News updated and broadcast to all students",
  "news": {
    /* news data */
  }
}
```

**Real-Time Event:** Emits `news:updated` to all connected clients

---

## Real-Time Events

### Socket.io Connection

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5001", {
  transports: ["websocket", "polling"],
});

// Authenticate
const token = await firebase.auth().currentUser.getIdToken();
socket.emit("authenticate", { token });

// Listen for authentication success
socket.on("authenticated", (data) => {
  console.log("Authenticated:", data.userId);
  console.log("Groups:", data.groups);
});
```

### Client → Server Events

#### authenticate

Authenticate the socket connection.

**Payload:**

```json
{
  "token": "firebase-id-token"
}
```

**Response Event:** `authenticated` or `error`

#### join:group

Join a group room.

**Payload:**

```json
{
  "groupId": "string"
}
```

**Authorization:** User must be a member of the group

#### leave:group

Leave a group room.

**Payload:**

```json
{
  "groupId": "string"
}
```

### Server → Client Events

#### authenticated

Authentication successful.

**Payload:**

```json
{
  "userId": "string",
  "groups": ["groupId1", "groupId2"]
}
```

#### exam:updated

Exam data has been updated.

**Payload:**

```json
{
  "examId": "string",
  "title": "string",
  "duration": "number",
  "questions": []
}
```

**Broadcast:** All connected clients

#### news:updated

News items have been updated.

**Payload:**

```json
{
  "newsId": "string",
  "title": "string",
  "content": "string",
  "author": "string",
  "publishedAt": "ISO 8601 date"
}
```

**Broadcast:** All connected clients

#### group:updated

Group data has been updated.

**Payload:**

```json
{
  "id": "string",
  "name": "string",
  "type": "single | multi",
  "members": ["firebaseUid"],
  "level": "number"
}
```

**Broadcast:** Group members only

#### message:new

New message in group.

**Payload:**

```json
{
  "_id": "string",
  "activityId": "string",
  "groupId": "string",
  "text": "string",
  "senderUid": "string",
  "createdAt": "ISO 8601 date"
}
```

**Broadcast:** Group members only

#### error

Error occurred.

**Payload:**

```json
{
  "message": "string"
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

### HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data or validation failed
- `401 Unauthorized` - Authentication required or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Common Errors

#### 401 Unauthorized

```json
{
  "error": "Authentication required"
}
```

**Causes:**

- Missing Authorization header
- Invalid Firebase token
- Expired token

#### 403 Forbidden

```json
{
  "success": false,
  "error": "Forbidden: Admin access required"
}
```

**Causes:**

- Non-admin accessing admin-only endpoint
- Student accessing another user's data
- User not member of requested group

#### 400 Bad Request (Validation)

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "fieldName",
        "message": "Specific error message"
      }
    ]
  }
}
```

**Causes:**

- Missing required fields
- Invalid field format
- Business rule violations

#### 400 Bad Request (Learning Path Validation)

```json
{
  "success": false,
  "error": "Learning path validation failed",
  "details": [
    "Cannot unlock module 2: Module 1 requires passing score (>= 60%), got 50%",
    "Invalid module sequence: expected module 2, found 3"
  ]
}
```

**Causes:**

- Attempting to skip modules
- Unlocking module without completing prerequisite
- Module score below passing threshold
- Non-sequential module progression

---

## Rate Limiting

Currently, no rate limiting is implemented. Consider implementing rate limiting in production:

```javascript
// Example rate limiting (not implemented)
// 100 requests per 15 minutes per IP
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**

- `limit` - Results per page (default varies by endpoint)
- `skip` - Number of results to skip (default: 0)

**Response:**

```json
{
  "pagination": {
    "total": 150,
    "limit": 100,
    "skip": 0,
    "hasMore": true
  }
}
```

**Example:**

```bash
# First page
GET /api/scores?limit=50&skip=0

# Second page
GET /api/scores?limit=50&skip=50

# Third page
GET /api/scores?limit=50&skip=100
```

---

## Best Practices

### Authentication

1. Always include Authorization header
2. Refresh tokens before expiration
3. Handle 401 errors by re-authenticating

### Error Handling

1. Check `success` field in responses
2. Display `error` message to users
3. Log `details` for debugging

### Real-Time

1. Authenticate socket immediately after connection
2. Handle `error` events
3. Reconnect on disconnection
4. Join/leave rooms as needed

### Pagination

1. Use appropriate `limit` for your use case
2. Implement infinite scroll or pagination UI
3. Check `hasMore` to determine if more results exist

---

## Environment Variables

Required environment variables:

```bash
# MongoDB
MONGO_URI=mongodb://localhost:27017/database

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Admin
ADMIN_EMAIL=admin@example.com

# Socket.io (optional)
SOCKET_IO_CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Server
PORT=5001
```

---

## Additional Resources

- [Scores & Learning Path API](./SCORES_LEARNING_PATH_API.md)
- [Data Migration Guide](./DATA_MIGRATION_GUIDE.md)
- [Validation Guide](./VALIDATION_GUIDE.md)
- [Security Guide](./SECURITY.md)
