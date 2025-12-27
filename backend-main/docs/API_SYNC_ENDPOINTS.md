# Sync API Endpoints

All endpoints require Firebase ID token authentication via `Authorization: Bearer <token>` header.

## POST /api/sync/user

Upsert user into MongoDB.

**Request:**

```json
{
  "firebaseUid": "string (required)",
  "username": "string (required, will be normalized: trim+lowercase)",
  "email": "string (required)",
  "profile": "object (optional)",
  "role": "string (optional, default: 'student', enum: 'admin'|'student'|'teacher')"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "_id": "...",
    "firebaseUid": "...",
    "username": "...",
    "email": "...",
    "profile": {},
    "role": "student",
    "loginTimes": [],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

## POST /api/sync/login-time

Record login timestamp for user.

**Request:**

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
    "_id": "...",
    "firebaseUid": "...",
    "loginTimes": ["2024-01-01T00:00:00.000Z", "..."],
    ...
  }
}
```

## POST /api/scores

Save exam/quiz score.

**Request:**

```json
{
  "studentUid": "string (required)",
  "examId": "string (required)",
  "score": "number (required)",
  "maxScore": "number (required)",
  "groupId": "string (optional)",
  "meta": "object (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "score": {
    "_id": "...",
    "studentUid": "...",
    "examId": "...",
    "score": 85,
    "maxScore": 100,
    "groupId": "...",
    "meta": {},
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

## POST /api/activity/file

Save activity file metadata.

**Request:**

```json
{
  "activityId": "string (required)",
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
    "_id": "...",
    "activityId": "...",
    "filename": "document.pdf",
    "url": "https://...",
    "uploadedByUid": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

## POST /api/activity/message

Save message to activity and emit socket event (socket.io integration pending).

**Request:**

```json
{
  "activityId": "string (required)",
  "text": "string (required)"
}
```

**Response:**

```json
{
  "success": true,
  "message": {
    "_id": "...",
    "activityId": "...",
    "text": "Hello world",
    "senderUid": "...",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "note": "Socket.io integration pending"
}
```

## Authentication

All endpoints use Firebase Admin SDK `admin.auth().verifyIdToken()` for authentication.

## Error Responses

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

Status codes:

- 400: Bad request (missing required fields)
- 401: Unauthorized (missing or invalid token)
- 404: Not found
- 500: Internal server error
