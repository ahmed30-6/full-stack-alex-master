# Scores & Learning Path API Documentation

## Overview

This document describes the Scores and Learning Path API endpoints that allow querying student scores, viewing learning progress, and managing educational data.

## Endpoints

### 1. GET /api/scores

Query scores with filters and pagination.

**Authentication**: Required (Firebase ID token)

**Authorization**:

- Students can only view their own scores
- Admins can view all scores

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| studentUid | string | No | Filter by student Firebase UID |
| examId | string | No | Filter by exam ID |
| groupId | string | No | Filter by group ID |
| limit | number | No | Results per page (default: 100, max: 1000) |
| skip | number | No | Number of results to skip (default: 0) |

**Example Requests**:

```bash
# Get current user's scores
GET /api/scores
Authorization: Bearer <token>

# Get specific student's scores (admin only)
GET /api/scores?studentUid=abc123&limit=50
Authorization: Bearer <admin-token>

# Get scores for specific exam
GET /api/scores?examId=module-1-final&limit=20
Authorization: Bearer <token>

# Get scores for specific group
GET /api/scores?groupId=group-a&skip=0&limit=100
Authorization: Bearer <admin-token>

# Paginated results
GET /api/scores?limit=50&skip=50
Authorization: Bearer <token>
```

**Response**:

```json
{
  "success": true,
  "scores": [
    {
      "_id": "score123",
      "studentUid": "user123",
      "examId": "module-1-final",
      "score": 85,
      "maxScore": 100,
      "groupId": "group-a",
      "meta": {
        "attempts": 1,
        "timeSpent": 1800
      },
      "createdAt": "2024-12-12T10:00:00.000Z",
      "updatedAt": "2024-12-12T10:00:00.000Z"
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

**Error Responses**:

```json
// 401 Unauthorized
{
  "error": "Authentication required"
}

// 403 Forbidden (trying to view other user's scores)
{
  "success": false,
  "error": "Forbidden: Cannot view other users' scores"
}

// 500 Internal Server Error
{
  "error": "Internal server error",
  "details": "Error message"
}
```

---

### 2. POST /api/scores

Save a new score (existing endpoint, enhanced).

**Authentication**: Required (Firebase ID token)

**Request Body**:

```json
{
  "studentUid": "user123",
  "examId": "module-1-final",
  "score": 85,
  "maxScore": 100,
  "groupId": "group-a",
  "meta": {
    "attempts": 1,
    "timeSpent": 1800
  }
}
```

**Enhanced Behavior**:

- Saves score to Score collection
- If examId matches pattern "module-X-\*", automatically updates AppDataModel.moduleScores
- Calculates percentage and stores completion timestamp

**Response**:

```json
{
  "success": true,
  "score": {
    "_id": "score123",
    "studentUid": "user123",
    "examId": "module-1-final",
    "score": 85,
    "maxScore": 100,
    "groupId": "group-a",
    "meta": {
      "attempts": 1,
      "timeSpent": 1800
    },
    "createdAt": "2024-12-12T10:00:00.000Z",
    "updatedAt": "2024-12-12T10:00:00.000Z"
  }
}
```

---

### 3. GET /api/appdata/:uid

Get learning path and progress for a specific user (admin only).

**Authentication**: Required (Firebase ID token)

**Authorization**: Admin only (ADMIN_EMAIL must match)

**URL Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| uid | string | Yes | Student's Firebase UID |

**Example Requests**:

```bash
# Get learning path for specific student
GET /api/appdata/abc123
Authorization: Bearer <admin-token>

# Get progress for another student
GET /api/appdata/xyz789
Authorization: Bearer <admin-token>
```

**Response**:

```json
{
  "success": true,
  "user": {
    "firebaseUid": "abc123",
    "username": "johndoe",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student"
  },
  "appData": {
    "email": "john@example.com",
    "moduleScores": {
      "1": {
        "score": 85,
        "maxScore": 100,
        "percentage": 85,
        "examId": "module-1-final",
        "completedAt": "2024-12-12T10:00:00.000Z"
      },
      "2": {
        "score": 90,
        "maxScore": 100,
        "percentage": 90,
        "examId": "module-2-final",
        "completedAt": "2024-12-12T11:00:00.000Z"
      }
    },
    "completedLessons": {
      "1": true,
      "2": true,
      "3": false
    },
    "finalQuizPassed": false,
    "unlockedModules": [1, 2],
    "currentActivityId": 5,
    "currentModuleId": 2,
    "moduleLessonIndex": 3,
    "modulePageIndex": 0,
    "learningPathTopic": "Introduction to Programming",
    "groups": [],
    "discussions": [],
    "newsItems": [],
    "createdAt": "2024-12-01T00:00:00.000Z",
    "updatedAt": "2024-12-12T11:00:00.000Z"
  }
}
```

**Error Responses**:

```json
// 401 Unauthorized
{
  "error": "Authentication required"
}

// 403 Forbidden (non-admin trying to access)
{
  "error": "Forbidden: Admin access required"
}

// 404 Not Found (user doesn't exist)
{
  "error": "User not found"
}

// 500 Internal Server Error
{
  "error": "Internal server error"
}
```

---

### 4. GET /api/appdata

Get learning path for current user (existing endpoint).

**Authentication**: Required (Firebase ID token)

**Response**:

```json
{
  "appData": {
    "email": "john@example.com",
    "moduleScores": { ... },
    "completedLessons": { ... },
    "finalQuizPassed": false,
    "unlockedModules": [1, 2],
    "currentActivityId": 5,
    "currentModuleId": 2,
    "moduleLessonIndex": 3,
    "modulePageIndex": 0,
    "learningPathTopic": "Introduction to Programming",
    "groups": [],
    "discussions": [],
    "newsItems": []
  }
}
```

---

### 5. POST /api/appdata

Save/update learning path data (existing endpoint).

**Authentication**: Required (Firebase ID token)

**Request Body**:

```json
{
  "moduleScores": {
    "1": { "preTest": 80, "postTest": 90 }
  },
  "completedLessons": {
    "1": true,
    "2": true
  },
  "finalQuizPassed": false,
  "unlockedModules": [1, 2],
  "currentModuleId": 2,
  "moduleLessonIndex": 0
}
```

**Response**:

```json
{
  "appData": { ... }
}
```

---

## Data Models

### Score Model

```typescript
{
  studentUid: string;      // Firebase UID
  examId: string;          // Exam identifier
  score: number;           // Points earned
  maxScore: number;        // Maximum possible points
  groupId?: string;        // Optional group identifier
  meta?: object;           // Optional metadata
  createdAt: Date;         // Auto-generated
  updatedAt: Date;         // Auto-generated
}
```

**Indexes**:

- `studentUid` (indexed)
- `examId` (indexed)
- `{ studentUid: 1, examId: 1 }` (compound index)

### AppData Model

```typescript
{
  email: string;                    // User email (unique)
  moduleScores?: object;            // Module scores by module ID
  completedLessons?: object;        // Completed lessons by lesson ID
  finalQuizPassed?: boolean;        // Final quiz status
  unlockedModules?: number[];       // Unlocked module IDs
  currentActivityId?: number;       // Current activity
  currentModuleId?: number;         // Current module
  moduleLessonIndex?: number;       // Current lesson index
  modulePageIndex?: number;         // Current page index
  learningPathTopic?: string;       // Current topic
  groups?: array;                   // User's groups
  discussions?: array;              // User's discussions
  newsItems?: array;                // User's news items
  createdAt: Date;                  // Auto-generated
  updatedAt: Date;                  // Auto-generated
}
```

---

## Use Cases

### Use Case 1: Student Views Their Scores

```bash
# Student logs in and views their scores
GET /api/scores
Authorization: Bearer <student-token>

# Response includes only their scores
{
  "success": true,
  "scores": [ ... ],
  "pagination": { ... }
}
```

### Use Case 2: Admin Views All Scores for an Exam

```bash
# Admin wants to see all scores for module 1 final exam
GET /api/scores?examId=module-1-final&limit=100
Authorization: Bearer <admin-token>

# Response includes all students' scores for that exam
{
  "success": true,
  "scores": [
    { "studentUid": "user1", "score": 85, ... },
    { "studentUid": "user2", "score": 92, ... },
    { "studentUid": "user3", "score": 78, ... }
  ],
  "pagination": { ... }
}
```

### Use Case 3: Admin Views Student's Learning Progress

```bash
# Admin wants to see John's learning progress
GET /api/appdata/abc123
Authorization: Bearer <admin-token>

# Response includes user info and complete learning path data
{
  "success": true,
  "user": {
    "firebaseUid": "abc123",
    "username": "johndoe",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student"
  },
  "appData": {
    "moduleScores": { ... },
    "completedLessons": { ... },
    "unlockedModules": [1, 2],
    "currentModuleId": 2
  }
}
```

### Use Case 4: Student Completes Exam

```bash
# Student completes module 1 final exam
POST /api/scores
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "studentUid": "abc123",
  "examId": "module-1-final",
  "score": 85,
  "maxScore": 100
}

# Backend automatically:
# 1. Saves score to Score collection
# 2. Updates AppDataModel.moduleScores.1 with score and percentage
# 3. Records completion timestamp
```

### Use Case 5: Admin Generates Progress Report

```bash
# Step 1: Get all students
GET /api/users?role=student
Authorization: Bearer <admin-token>

# Step 2: For each student, get their learning progress
GET /api/appdata/student1-uid
GET /api/appdata/student2-uid
GET /api/appdata/student3-uid
Authorization: Bearer <admin-token>

# Step 3: Get all scores for analysis
GET /api/scores?limit=1000
Authorization: Bearer <admin-token>

# Admin can now generate comprehensive progress report
```

---

## Security & Permissions

### Student Permissions

- ✅ Can view their own scores
- ✅ Can view their own learning path
- ✅ Can save their own scores
- ✅ Can update their own learning path
- ❌ Cannot view other students' scores
- ❌ Cannot view other students' learning paths

### Admin Permissions

- ✅ Can view all scores
- ✅ Can view all students' learning paths
- ✅ Can filter and query scores
- ✅ Can generate reports

### Permission Checks

```typescript
// GET /api/scores
if (!isAdmin && studentUid && studentUid !== decoded.uid) {
  return 403 Forbidden;
}

// GET /api/appdata/:uid
if (decoded.email !== ADMIN_EMAIL) {
  return 403 Forbidden;
}
```

---

## Performance Considerations

### Indexes

All query fields are indexed for optimal performance:

- `Score.studentUid` (indexed)
- `Score.examId` (indexed)
- `Score.groupId` (indexed)
- `Score.{ studentUid, examId }` (compound index)

### Pagination

- Default limit: 100 results
- Maximum limit: 1000 results
- Use `skip` and `limit` for pagination
- `hasMore` flag indicates if more results exist

### Caching Recommendations

- Cache frequently accessed scores
- Cache student learning paths
- Invalidate cache on score updates

---

## Error Handling

### Common Errors

**401 Unauthorized**

- Missing or invalid Firebase token
- Token expired

**403 Forbidden**

- Student trying to view other students' data
- Non-admin trying to access admin endpoints

**404 Not Found**

- User not found (GET /api/appdata/:uid)

**500 Internal Server Error**

- Database connection issues
- Unexpected errors

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

---

## Testing

### Manual Testing

#### Test 1: Get Own Scores

```bash
curl -X GET "http://localhost:5001/api/scores" \
  -H "Authorization: Bearer STUDENT_TOKEN"
```

#### Test 2: Get Scores with Filters

```bash
curl -X GET "http://localhost:5001/api/scores?examId=module-1-final&limit=10" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Test 3: Get Student Learning Path (Admin)

```bash
curl -X GET "http://localhost:5001/api/appdata/abc123" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Test 4: Save Score

```bash
curl -X POST "http://localhost:5001/api/scores" \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentUid": "abc123",
    "examId": "module-1-final",
    "score": 85,
    "maxScore": 100
  }'
```

### Automated Testing

See `tests/scores-learning-path.test.ts` for comprehensive test suite.

---

## Migration Notes

### No Breaking Changes

- All endpoints are new or enhanced
- Existing endpoints remain backward compatible
- No database migration required

### Optional: Backfill Module Scores

If you have existing scores that should be reflected in AppDataModel:

```javascript
// Run this script to backfill module scores
const scores = await Score.find({ examId: /module-\d+-/ });
for (const score of scores) {
  const user = await User.findOne({ firebaseUid: score.studentUid });
  if (user) {
    const moduleMatch = score.examId.match(/module-(\d+)-/);
    if (moduleMatch) {
      const moduleId = moduleMatch[1];
      await AppDataModel.findOneAndUpdate(
        { email: user.email },
        {
          $set: {
            [`moduleScores.${moduleId}`]: {
              score: score.score,
              maxScore: score.maxScore,
              percentage: Math.round((score.score / score.maxScore) * 100),
              examId: score.examId,
              completedAt: score.createdAt,
            },
          },
        },
        { upsert: true }
      );
    }
  }
}
```

---

## Future Enhancements

1. **Score Analytics**

   - Average scores per exam
   - Score distribution
   - Trend analysis

2. **Learning Path Analytics**

   - Completion rates
   - Time spent per module
   - Common bottlenecks

3. **Bulk Operations**

   - Bulk score import
   - Bulk progress updates

4. **Real-time Updates**

   - Socket.io events for score updates
   - Live leaderboards

5. **Export Functionality**
   - Export scores to CSV
   - Export learning paths to PDF

---

## Support

For issues or questions:

- Check error messages in response
- Review server logs
- Verify authentication token
- Confirm admin permissions for admin endpoints
