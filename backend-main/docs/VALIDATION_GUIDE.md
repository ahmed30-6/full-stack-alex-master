# Input Validation Guide

## Overview

This guide documents the input validation layer implemented using Joi for all backend endpoints. All requests are validated before processing to ensure data integrity and security.

## Validation Library

**Joi v17.11.0** - Schema description language and validator for JavaScript objects.

## Architecture

### Validation Middleware

Located in `middleware/validation.ts`:

- `validate(schema)` - Validates request body
- `validateQuery(schema)` - Validates query parameters
- `validateParams(schema)` - Validates URL parameters

### Validation Schemas

Located in `validators/schemas.ts`:

- Centralized schema definitions
- Reusable validation patterns
- Custom validation rules

## Error Response Format

All validation errors return a consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "\"email\" must be a valid email"
      },
      {
        "field": "score",
        "message": "\"score\" is required"
      }
    ]
  }
}
```

**Status Code**: 400 Bad Request

## Validated Endpoints

### 1. POST /api/sync/user

**Schema**: `syncUserSchema`

**Required Fields**:

- `firebaseUid` (string, 1-128 chars)
- `username` (string, 3-30 chars)
- `email` (valid email format)

**Optional Fields**:

- `profile` (object)
- `role` (enum: 'admin', 'student', 'teacher')

**Example Valid Request**:

```json
{
  "firebaseUid": "abc123xyz",
  "username": "johndoe",
  "email": "john@example.com",
  "role": "student"
}
```

**Example Invalid Request**:

```json
{
  "firebaseUid": "",
  "username": "ab",
  "email": "invalid-email"
}
```

**Error Response**:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "firebaseUid",
        "message": "\"firebaseUid\" is not allowed to be empty"
      },
      {
        "field": "username",
        "message": "\"username\" length must be at least 3 characters long"
      },
      {
        "field": "email",
        "message": "\"email\" must be a valid email"
      }
    ]
  }
}
```

---

### 2. POST /api/sync/login-time

**Schema**: `syncLoginTimeSchema`

**Required Fields**:

- `firebaseUid` (string, 1-128 chars)

**Example**:

```json
{
  "firebaseUid": "abc123xyz"
}
```

---

### 3. POST /api/scores

**Schema**: `scoresSchema`

**Required Fields**:

- `studentUid` (string)
- `examId` (string)
- `score` (number, >= 0)
- `maxScore` (number, >= 0)

**Optional Fields**:

- `groupId` (string)
- `meta` (object)

**Custom Validation**:

- `score` cannot exceed `maxScore`

**Example Valid Request**:

```json
{
  "studentUid": "user123",
  "examId": "exam-001",
  "score": 85,
  "maxScore": 100,
  "groupId": "group-a"
}
```

**Example Invalid Request** (score > maxScore):

```json
{
  "studentUid": "user123",
  "examId": "exam-001",
  "score": 110,
  "maxScore": 100
}
```

**Error Response**:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "",
        "message": "score cannot exceed maxScore"
      }
    ]
  }
}
```

---

### 4. GET /api/scores

**Schema**: `scoresQuerySchema`

**Optional Query Parameters**:

- `studentUid` (string)
- `examId` (string)
- `groupId` (string)
- `limit` (number, 1-1000, default: 100)
- `skip` (number, >= 0, default: 0)

**Example**:

```
GET /api/scores?studentUid=user123&limit=50&skip=0
```

---

### 5. POST /api/activity/file

**Schema**: `activityFileSchema`

**Required Fields**:

- `activityId` (string)
- `filename` (string, 1-255 chars)
- `url` (valid URI, max 500 chars)
- `uploadedByUid` (string)

**Example**:

```json
{
  "activityId": "activity-001",
  "filename": "document.pdf",
  "url": "https://storage.example.com/files/document.pdf",
  "uploadedByUid": "user123"
}
```

---

### 6. GET /api/activity/file

**Schema**: `activityFileQuerySchema`

**Optional Query Parameters**:

- `activityId` (string)
- `groupId` (string)
- `uploadedByUid` (string)
- `limit` (number, 1-1000, default: 100)
- `skip` (number, >= 0, default: 0)

---

### 7. POST /api/activity/message

**Schema**: `activityMessageSchema`

**Required Fields**:

- `activityId` (string)
- `text` (string, 1-5000 chars)

**Optional Fields**:

- `groupId` (string)

**Example**:

```json
{
  "activityId": "activity-001",
  "text": "Hello, this is a message!",
  "groupId": "group-a"
}
```

---

### 8. GET /api/activity/message

**Schema**: `activityMessageQuerySchema`

**Optional Query Parameters**:

- `activityId` (string)
- `groupId` (string)
- `limit` (number, 1-1000, default: 100)
- `skip` (number, >= 0, default: 0)

---

### 9. POST /api/appdata

**Schema**: `appDataSchema`

**All Fields Optional**:

- `moduleScores` (object)
- `completedLessons` (object)
- `finalQuizPassed` (boolean)
- `unlockedModules` (array of numbers)
- `currentActivityId` (number or null)
- `currentModuleId` (number or null)
- `moduleLessonIndex` (number, >= 0)
- `modulePageIndex` (number, >= 0)
- `learningPathTopic` (string or null)
- `groups` (array)
- `discussions` (array)
- `newsItems` (array)

**Example**:

```json
{
  "moduleScores": { "1": { "preTest": 80, "postTest": 90 } },
  "completedLessons": { "1": true, "2": true },
  "finalQuizPassed": false,
  "unlockedModules": [1, 2],
  "currentModuleId": 2,
  "moduleLessonIndex": 0
}
```

---

### 10. POST /api/users

**Schema**: `createUserSchema`

**Required Fields**:

- `name` (string, 1-100 chars)

**Optional Fields**:

- `email` (valid email)
- `avatar` (valid URI or null/empty string)
- `updateName` (boolean)

**Example**:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "avatar": "https://example.com/avatar.jpg",
  "updateName": true
}
```

---

### 11. GET /api/users

**Schema**: `getUsersQuerySchema`

**Optional Query Parameters**:

- `role` (enum: 'admin', 'student', 'teacher')
- `status` (enum: 'active', 'inactive', 'suspended')
- `limit` (number, 1-1000, default: 1000)
- `skip` (number, >= 0, default: 0)

**Example**:

```
GET /api/users?role=student&status=active&limit=50
```

---

### 12. POST /api/profile

**Schema**: `profileSchema`

**Required**: At least one of:

- `email` (valid email)
- `firebaseUid` (string)

**Example**:

```json
{
  "email": "john@example.com"
}
```

OR

```json
{
  "firebaseUid": "abc123xyz"
}
```

**Error if neither provided**:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "",
        "message": "\"value\" must contain at least one of [email, firebaseUid]"
      }
    ]
  }
}
```

---

### 13. POST /api/loginEvent

**Schema**: `loginEventSchema`

**All Fields Optional**:

- `name` (string)
- `email` (valid email)
- `userAgent` (string, max 500 chars)

**Example**:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "userAgent": "Mozilla/5.0..."
}
```

---

### 14. POST /api/groups (Future)

**Schema**: `createGroupSchema`

**Required Fields**:

- `name` (string, 1-100 chars)
- `members` (array of strings, **exactly 1 member**)

**Optional Fields**:

- `level` (number, >= 1)
- `description` (string, max 500 chars)

**Example Valid Request**:

```json
{
  "name": "Study Group A",
  "members": ["user123"],
  "level": 1,
  "description": "Beginner level study group"
}
```

**Example Invalid Request** (multiple members):

```json
{
  "name": "Study Group A",
  "members": ["user123", "user456"]
}
```

**Error Response**:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "members",
        "message": "Group must have exactly one member"
      }
    ]
  }
}
```

---

### 15. GET /api/groups (Future)

**Schema**: `getGroupsQuerySchema`

**Optional Query Parameters**:

- `level` (number, >= 1)
- `limit` (number, 1-1000, default: 100)
- `skip` (number, >= 0, default: 0)

---

## Common Validation Patterns

### Email

```typescript
Joi.string().email().required();
```

- Must be valid email format
- Required field

### Firebase UID

```typescript
Joi.string().min(1).max(128).required();
```

- 1-128 characters
- Required field

### Username

```typescript
Joi.string().min(3).max(30).required();
```

- 3-30 characters
- Required field

### URL

```typescript
Joi.string().uri().max(500);
```

- Must be valid URI
- Max 500 characters

### Role

```typescript
Joi.string().valid("admin", "student", "teacher");
```

- Must be one of: admin, student, teacher

### Status

```typescript
Joi.string().valid("active", "inactive", "suspended");
```

- Must be one of: active, inactive, suspended

### Pagination

```typescript
{
  limit: Joi.number().integer().min(1).max(1000).default(100),
  skip: Joi.number().integer().min(0).default(0)
}
```

- limit: 1-1000, default 100
- skip: >= 0, default 0

## Benefits

### Security

- ✅ Prevents injection attacks
- ✅ Validates data types
- ✅ Enforces length limits
- ✅ Sanitizes input (strips unknown fields)

### Data Integrity

- ✅ Ensures required fields are present
- ✅ Validates data formats (email, URL, etc.)
- ✅ Enforces business rules (score <= maxScore)
- ✅ Consistent data structure

### Developer Experience

- ✅ Clear error messages
- ✅ Detailed validation feedback
- ✅ Centralized validation logic
- ✅ Easy to maintain and extend

### API Quality

- ✅ Consistent error responses
- ✅ Self-documenting schemas
- ✅ Prevents invalid data from reaching database
- ✅ Reduces debugging time

## Testing Validation

### Valid Request

```bash
curl -X POST http://localhost:5001/api/sync/user \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseUid": "abc123",
    "username": "johndoe",
    "email": "john@example.com"
  }'
```

**Expected**: 200 OK with user data

### Invalid Request (Missing Required Field)

```bash
curl -X POST http://localhost:5001/api/sync/user \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseUid": "abc123",
    "username": "johndoe"
  }'
```

**Expected**: 400 Bad Request

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "\"email\" is required"
      }
    ]
  }
}
```

### Invalid Request (Invalid Format)

```bash
curl -X POST http://localhost:5001/api/sync/user \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseUid": "abc123",
    "username": "ab",
    "email": "not-an-email"
  }'
```

**Expected**: 400 Bad Request

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "username",
        "message": "\"username\" length must be at least 3 characters long"
      },
      {
        "field": "email",
        "message": "\"email\" must be a valid email"
      }
    ]
  }
}
```

## Extending Validation

### Adding New Schema

1. Create schema in `validators/schemas.ts`:

```typescript
export const myNewSchema = Joi.object({
  field1: Joi.string().required(),
  field2: Joi.number().min(0).optional(),
});
```

2. Import in route file:

```typescript
import { myNewSchema } from "../validators/schemas";
```

3. Apply to endpoint:

```typescript
router.post("/my-endpoint", validate(myNewSchema), async (req, res) => {
  // Handler code
});
```

### Custom Validation Rules

```typescript
export const customSchema = Joi.object({
  field1: Joi.string().required(),
  field2: Joi.number().required(),
}).custom((value, helpers) => {
  // Custom validation logic
  if (value.field1 === "invalid") {
    return helpers.error("any.invalid");
  }
  return value;
});
```

## Troubleshooting

### Validation Always Fails

- Check that request Content-Type is `application/json`
- Verify field names match schema exactly (case-sensitive)
- Check that values match expected types

### Unknown Fields Removed

- This is intentional (stripUnknown: true)
- Only fields defined in schema are kept
- Add fields to schema if they should be accepted

### Custom Error Messages

Modify schema with `.messages()`:

```typescript
Joi.string().required().messages({
  "string.empty": "Field cannot be empty",
  "any.required": "This field is required",
});
```

## Migration from Unvalidated Endpoints

### Before

```typescript
app.post("/api/endpoint", async (req, res) => {
  const { field1, field2 } = req.body;
  // No validation
  // Process data
});
```

### After

```typescript
import { validate } from "../middleware/validation";
import { mySchema } from "../validators/schemas";

app.post("/api/endpoint", validate(mySchema), async (req, res) => {
  const { field1, field2 } = req.body;
  // Data is already validated
  // Process data
});
```

## Best Practices

1. **Always validate user input** - Never trust client data
2. **Use appropriate constraints** - Set min/max lengths, ranges
3. **Provide clear error messages** - Help users fix issues
4. **Validate early** - Before database operations
5. **Keep schemas centralized** - Easy to maintain
6. **Test validation** - Include validation tests
7. **Document schemas** - Keep this guide updated

## Resources

- [Joi Documentation](https://joi.dev/api/)
- [Joi GitHub](https://github.com/hapijs/joi)
- [Express Middleware Guide](https://expressjs.com/en/guide/using-middleware.html)
