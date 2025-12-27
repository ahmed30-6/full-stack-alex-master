# Design Document

## Overview

This design document specifies the implementation of the remaining backend features (Tasks 6-10) for the Adaptive Collaborative Learning Platform. The system will add group management with single-member validation, group-based chat and file filtering, unified login tracking, learning path validation, and real-time admin update broadcasting via WebSocket.

The implementation follows the existing architecture patterns established in Tasks 1-5, using TypeScript/Express.js with MongoDB for persistence, Firebase Admin SDK for authentication, and Joi for input validation. This design introduces Socket.io for real-time communication and implements business logic validation for learning path progression.

## Architecture

### System Components

The backend system consists of the following layers:

1. **API Layer** (Express.js routes)

   - Group management endpoints (`/api/groups`)
   - Enhanced message/file endpoints with group filtering
   - Login tracking endpoint (`/api/login-times/:uid`)
   - Learning path validation integrated into existing endpoints
   - Real-time event endpoints

2. **Middleware Layer**

   - Authentication (Firebase token verification)
   - Input normalization (username, email)
   - Input validation (Joi schemas)
   - Authorization (admin-only checks)

3. **Service Layer** (New)

   - `GroupService`: Group creation and membership validation
   - `LearningPathService`: Progression rule validation
   - `RealtimeService`: Socket.io event management

4. **Data Layer** (Mongoose models)

   - `Group`: New model for group management
   - `Message`: Enhanced with groupId field
   - `ActivityFile`: Enhanced with groupId field
   - `User`: Existing model with loginTimes array
   - `AppDataModel`: Existing model for learning path state

5. **Real-time Layer** (Socket.io)
   - WebSocket connection management
   - Room-based event broadcasting
   - Event emitters for admin updates

### Technology Stack

- **Runtime**: Node.js 25.x
- **Language**: TypeScript 5.9.3
- **Framework**: Express.js 4.21.2
- **Database**: MongoDB 6.21.0 via Mongoose 9.0.0
- **Authentication**: Firebase Admin SDK 12.0.0
- **Validation**: Joi 17.11.0
- **Real-time**: Socket.io 4.x (new dependency)
- **Testing**: Jest 29.x (existing)

### Data Flow

#### Group Creation Flow

```
Admin Request → Auth Middleware → Validation → GroupService.create()
→ Validate single member → Save to DB → Return group
```

#### Group Chat Flow

```
Student Message → Auth Middleware → Validation → Get user's groups
→ Associate with groupId → Save message → Broadcast via Socket.io
→ Return to sender
```

#### Learning Path Update Flow

```
Student Update → Auth Middleware → Validation → LearningPathService.validate()
→ Check prerequisites → Check sequence → Save if valid → Return result
```

#### Real-time Admin Update Flow

```
Admin Update → Auth Middleware → Save to DB → RealtimeService.emit()
→ Identify target rooms → Broadcast event → Clients receive update
```

## Components and Interfaces

### Group Model

```typescript
interface IGroup extends Document {
  name: string;
  type: "single" | "multi";
  members: string[]; // Array of firebaseUid
  level?: number;
  createdBy: string; // Admin firebaseUid
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**

- `members` (array index for membership queries)
- `type` (for filtering by group type)
- `createdBy` (for admin queries)

### Enhanced Message Model

```typescript
interface IMessage extends Document {
  activityId: string;
  groupId: string; // NEW: Required field
  text: string;
  senderUid: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**New Index:** `groupId` for efficient filtering

### Enhanced ActivityFile Model

```typescript
interface IActivityFile extends Document {
  activityId: string;
  groupId: string; // NEW: Required field
  filename: string;
  url: string;
  uploadedByUid: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**New Index:** `groupId` for efficient filtering

### GroupService Interface

```typescript
interface IGroupService {
  createGroup(data: CreateGroupDTO, adminUid: string): Promise<IGroup>;
  validateSingleMember(members: string[]): void;
  getGroupsByMember(memberUid: string): Promise<IGroup[]>;
  getAllGroups(): Promise<IGroup[]>;
  getUserGroups(userUid: string): Promise<string[]>; // Returns groupIds
}
```

### LearningPathService Interface

```typescript
interface ILearningPathService {
  validateModuleUnlock(
    currentPath: IAppData,
    moduleId: number
  ): ValidationResult;

  validateLessonCompletion(
    currentPath: IAppData,
    moduleId: number,
    lessonId: number
  ): ValidationResult;

  validateQuizCompletion(
    currentPath: IAppData,
    score: number,
    maxScore: number
  ): ValidationResult;

  validateUpdate(
    currentPath: IAppData,
    updates: Partial<IAppData>
  ): ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

### RealtimeService Interface

```typescript
interface IRealtimeService {
  initialize(server: http.Server): void;

  emitToAll(event: string, data: any): void;

  emitToGroup(groupId: string, event: string, data: any): void;

  emitToUser(userUid: string, event: string, data: any): void;

  handleConnection(socket: Socket): void;

  handleDisconnection(socket: Socket): void;
}
```

### API Endpoints

#### New Endpoints

1. **POST /api/groups** (Admin only)

   - Create a new group with single-member validation
   - Request: `{ name, type, members, level? }`
   - Response: `{ success, group }`

2. **GET /api/groups** (Admin only)

   - Retrieve all groups
   - Query params: `limit`, `skip`, `type?`
   - Response: `{ success, groups, total }`

3. **GET /api/login-times/:uid** (Admin only)
   - Get all login timestamps for a user
   - Response: `{ success, user, loginTimes }`

#### Enhanced Endpoints

4. **POST /api/activity/message**

   - Now requires groupId
   - Validates sender is group member
   - Broadcasts message via Socket.io
   - Request: `{ activityId, groupId, text }`

5. **POST /api/activity/file**

   - Now requires groupId
   - Validates uploader is group member
   - Request: `{ activityId, groupId, filename, url }`

6. **GET /api/activity/message**

   - Filters by groupId
   - Only returns messages from user's groups
   - Query params: `groupId?, activityId?, limit?, skip?`

7. **GET /api/activity/file**

   - Filters by groupId
   - Only returns files from user's groups
   - Query params: `groupId?, activityId?, limit?, skip?`

8. **POST /api/appdata**
   - Enhanced with learning path validation
   - Validates module unlocks and progression
   - Rejects invalid updates with detailed errors

#### Socket.io Events

**Client → Server:**

- `authenticate` - Client sends Firebase token
- `join:group` - Join a group room
- `leave:group` - Leave a group room

**Server → Client:**

- `exam:updated` - Exam data changed
- `news:updated` - News items changed
- `group:updated` - Group data changed
- `message:new` - New message in group
- `authenticated` - Authentication successful
- `error` - Error occurred

## Data Models

### Group Schema

```typescript
const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["single", "multi"],
      required: true,
      default: "single",
    },
    members: {
      type: [String],
      required: true,
      validate: {
        validator: function (v: string[]) {
          if (this.type === "single") {
            return v.length === 1;
          }
          return v.length > 0;
        },
        message: "Single-type groups must have exactly one member",
      },
    },
    level: { type: Number },
    createdBy: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

GroupSchema.index({ members: 1 });
GroupSchema.index({ type: 1 });
```

### AppData Model (Existing)

```typescript
interface IAppData {
  email: string;
  moduleScores: Record<
    number,
    { score: number; maxScore: number; timestamp: Date }
  >;
  completedLessons: Record<number, number[]>; // moduleId -> lessonIds
  finalQuizPassed: boolean;
  unlockedModules: number[];
  currentActivityId: number;
  currentModuleId: number;
  moduleLessonIndex: number;
  modulePageIndex: number;
  learningPathTopic: string;
  groups: any[];
  discussions: any[];
  newsItems: any[];
}
```

### Learning Path Validation Rules

1. **Module Unlock Rules:**

   - Module 1 is always unlocked
   - Module N requires Module N-1 to be completed (score >= 60%)
   - Modules must be unlocked sequentially

2. **Lesson Completion Rules:**

   - Lessons can only be completed in unlocked modules
   - Lesson completion is tracked per module

3. **Quiz Completion Rules:**

   - Final quiz requires all modules completed
   - Passing score is 60% or higher
   - Quiz can be retaken if failed

4. **Progression Sequence:**
   - Students cannot skip modules
   - Students cannot unlock future modules without completing current
   - Module scores must meet threshold before progression

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Group creation stores complete data

_For any_ valid group data (name, type, members) provided by an administrator, creating a group should result in a stored group with a unique identifier, the provided name, type, and members array.

**Validates: Requirements 1.1**

### Property 2: Single-type groups enforce exactly one member

_For any_ group creation request with type "single", the request should be accepted if and only if the members array contains exactly one element. Requests with zero members or more than one member should be rejected with a validation error.

**Validates: Requirements 1.2, 1.3, 1.4**

### Property 3: Group retrieval returns all groups

_For any_ set of created groups, querying all groups should return a list containing all created groups with their complete data (id, name, type, members, metadata).

**Validates: Requirements 1.5**

### Property 4: Messages and files associate with sender's group

_For any_ student sending a message or uploading file metadata, the saved message or file should contain the groupId of a group where the student is a member.

**Validates: Requirements 2.1, 2.3**

### Property 5: Group-based access control for messages and files

_For any_ student querying messages or files, the results should only include items where the student is a member of the associated group. Items from groups where the student is not a member should never be returned.

**Validates: Requirements 2.2, 2.4**

### Property 6: Real-time message broadcasting to group members

_For any_ message sent to a group, all connected clients who are members of that group should receive a real-time broadcast event containing the message data.

**Validates: Requirements 2.5**

### Property 7: Login timestamps are recorded

_For any_ student login event, the user's loginTimes array should grow by one element and the new element should be a timestamp representing the login time.

**Validates: Requirements 3.1**

### Property 8: Admin retrieval of login times

_For any_ user with login history, when an administrator queries that user's login times, the response should contain all timestamps from the user's loginTimes array.

**Validates: Requirements 3.2**

### Property 9: Non-admin access control for login times

_For any_ non-administrator user attempting to query another user's login times, the request should be rejected with a 403 forbidden error.

**Validates: Requirements 3.3**

### Property 10: Login timestamps maintain chronological order

_For any_ user's loginTimes array, the timestamps should be in chronological order (each timestamp is greater than or equal to the previous one).

**Validates: Requirements 3.4**

### Property 11: Module unlock requires prerequisites

_For any_ module unlock attempt, the unlock should be accepted if and only if all prerequisite modules have been completed with a passing score (>= 60%). Attempts to unlock modules without completing prerequisites should be rejected.

**Validates: Requirements 4.1**

### Property 12: Lesson completion requires unlocked module

_For any_ lesson completion attempt, the completion should be accepted if and only if the lesson's module is in the unlockedModules array. Attempts to complete lessons in locked modules should be rejected.

**Validates: Requirements 4.2**

### Property 13: Invalid learning path updates are rejected

_For any_ learning path update that violates progression rules (skipping modules, unlocking out of sequence, invalid scores), the update should be rejected with a detailed validation error describing the violation.

**Validates: Requirements 4.3**

### Property 14: Final quiz requires passing score

_For any_ final quiz completion attempt, the finalQuizPassed field should be set to true if and only if the score divided by maxScore is greater than or equal to 0.6 (60%).

**Validates: Requirements 4.4**

### Property 15: Module progression follows sequence

_For any_ learning path update, the unlockedModules array should only contain sequential module numbers starting from 1 (e.g., [1, 2, 3] is valid, [1, 3] is invalid).

**Validates: Requirements 4.5**

### Property 16: Admin updates broadcast to all students

_For any_ exam or news update performed by an administrator, all connected student clients should receive a real-time event ("exam:updated" or "news:updated") containing the updated data.

**Validates: Requirements 5.1, 5.2**

### Property 17: Group updates broadcast to group members only

_For any_ group update performed by an administrator, all connected clients who are members of that specific group should receive a "group:updated" event, and clients who are not members should not receive the event.

**Validates: Requirements 5.3**

### Property 18: WebSocket connection establishment

_For any_ student connection attempt with valid authentication, a WebSocket connection should be successfully established and the client should be able to receive real-time events.

**Validates: Requirements 5.4**

### Property 19: Event payloads contain updated data

_For any_ real-time event emitted by the system, the event message should include a data payload containing the updated information relevant to that event type.

**Validates: Requirements 5.5**

## Error Handling

### Validation Errors

All validation errors follow a consistent format:

```typescript
{
  success: false,
  error: {
    message: "Validation failed",
    details: [
      {
        field: "fieldName",
        message: "Specific error message"
      }
    ]
  }
}
```

### Error Types

1. **Authentication Errors (401)**

   - Missing or invalid Firebase token
   - Expired token
   - Token verification failure

2. **Authorization Errors (403)**

   - Non-admin accessing admin-only endpoints
   - Student accessing another user's private data
   - User not member of requested group

3. **Validation Errors (400)**

   - Invalid input format
   - Missing required fields
   - Business rule violations (e.g., single-member constraint)
   - Learning path progression violations

4. **Not Found Errors (404)**

   - Group not found
   - User not found
   - Resource not found

5. **Server Errors (500)**
   - Database connection failures
   - Unexpected exceptions
   - Socket.io connection errors

### Error Handling Strategy

1. **Input Validation**: Catch errors early with Joi schemas
2. **Business Logic Validation**: Use service layer to validate rules
3. **Database Errors**: Wrap in try-catch with meaningful messages
4. **Socket.io Errors**: Emit error events to clients
5. **Logging**: Log all errors with context for debugging

## Testing Strategy

### Dual Testing Approach

This implementation requires both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit tests** verify specific examples, edge cases, and error conditions
- **Property tests** verify universal properties that should hold across all inputs
- Together they provide comprehensive coverage: unit tests catch concrete bugs, property tests verify general correctness

### Unit Testing

Unit tests will cover:

1. **Specific Examples**

   - Creating a group with one member succeeds
   - Creating a group with two members fails
   - Admin can retrieve all groups
   - Student can only see their group's messages

2. **Edge Cases**

   - Empty member array
   - Empty message text
   - Zero login timestamps
   - Module 1 unlock (always allowed)

3. **Integration Points**
   - Socket.io connection and disconnection
   - Event emission and reception
   - Database transactions
   - Middleware chain execution

### Property-Based Testing

Property-based testing will use **fast-check** (JavaScript/TypeScript PBT library) to verify the correctness properties defined above.

**Configuration:**

- Each property test will run a minimum of 100 iterations
- Tests will use random data generators for comprehensive coverage
- Each test will be tagged with the property it validates

**Test Tagging Format:**

```typescript
// Feature: backend-tasks-6-10, Property 2: Single-type groups enforce exactly one member
```

**Property Test Coverage:**

1. **Group Management (Properties 1-3)**

   - Generate random group data and verify storage
   - Generate groups with varying member counts
   - Verify retrieval completeness

2. **Group-Based Access Control (Properties 4-6)**

   - Generate random messages/files with group associations
   - Verify access filtering across random user/group combinations
   - Test real-time broadcasting with random group memberships

3. **Login Tracking (Properties 7-10)**

   - Generate random login sequences
   - Verify timestamp recording and ordering
   - Test access control with random user roles

4. **Learning Path Validation (Properties 11-15)**

   - Generate random learning path states
   - Generate random progression attempts (valid and invalid)
   - Verify validation rules across all combinations

5. **Real-time Updates (Properties 16-19)**
   - Generate random admin updates
   - Verify event emission to correct recipients
   - Verify payload completeness

**Generators:**

```typescript
// Example generators for property tests
const groupDataGen = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  type: fc.constantFrom("single", "multi"),
  members: fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
});

const learningPathGen = fc.record({
  unlockedModules: fc.array(fc.integer({ min: 1, max: 10 })),
  moduleScores: fc.dictionary(
    fc.integer({ min: 1, max: 10 }).map(String),
    fc.record({
      score: fc.integer({ min: 0, max: 100 }),
      maxScore: fc.constant(100),
    })
  ),
});
```

### Test Organization

```
tests/
├── unit/
│   ├── group.test.ts
│   ├── message-filtering.test.ts
│   ├── login-tracking.test.ts
│   ├── learning-path.test.ts
│   └── realtime.test.ts
├── property/
│   ├── group-properties.test.ts
│   ├── access-control-properties.test.ts
│   ├── login-properties.test.ts
│   ├── learning-path-properties.test.ts
│   └── realtime-properties.test.ts
└── integration/
    ├── group-chat-flow.test.ts
    ├── learning-progression-flow.test.ts
    └── realtime-updates-flow.test.ts
```

### Testing Requirements

- All new endpoints must have unit tests
- All correctness properties must have property-based tests
- Integration tests must cover end-to-end flows
- Test coverage target: 80% for new code
- All tests must pass before merging

## Security Considerations

### Authentication

- All endpoints require valid Firebase ID token
- Token verification on every request
- Token expiration handled gracefully

### Authorization

- Admin-only endpoints check `decoded.email === ADMIN_EMAIL`
- Group membership verified before message/file access
- Login times only accessible by admin or self

### Input Validation

- All inputs validated with Joi schemas
- SQL/NoSQL injection prevention
- XSS prevention through input sanitization
- Length limits on all string fields

### Real-time Security

- Socket.io connections require authentication
- Clients can only join rooms for their groups
- Event emission restricted by membership
- Rate limiting on event emission (future enhancement)

### Data Privacy

- Students cannot access other students' data
- Group messages only visible to members
- Login times protected by admin-only access
- Learning path data private to student and admin

## Performance Considerations

### Database Optimization

- Indexes on frequently queried fields (groupId, members)
- Compound indexes for common query patterns
- Pagination on list endpoints (limit/skip)
- Efficient membership queries using array indexes

### Real-time Optimization

- Room-based broadcasting (not broadcast to all)
- Connection pooling for Socket.io
- Event batching for multiple updates (future)
- Heartbeat mechanism for connection health

### Caching Strategy (Future)

- Cache group memberships in Redis
- Cache learning path validation rules
- Invalidate cache on updates
- TTL-based expiration

## Deployment Considerations

### Environment Variables

New environment variables required:

```
SOCKET_IO_CORS_ORIGIN=http://localhost:3000,http://localhost:5173
LEARNING_PATH_PASSING_SCORE=0.6
```

### Database Migrations

1. **Add groupId to existing messages:**

```javascript
db.messages.updateMany(
  { groupId: { $exists: false } },
  { $set: { groupId: "default-group" } }
);
```

2. **Add groupId to existing files:**

```javascript
db.activityfiles.updateMany(
  { groupId: { $exists: false } },
  { $set: { groupId: "default-group" } }
);
```

3. **Create default groups for existing users:**

```javascript
// Script to create single-member groups for all students
```

### Backward Compatibility

- Existing endpoints remain unchanged
- New fields are optional where possible
- Migration scripts provided for data updates
- Graceful degradation if Socket.io unavailable

### Monitoring

- Log all group creation events
- Monitor Socket.io connection count
- Track validation failure rates
- Alert on learning path validation errors

## Future Enhancements

1. **Multi-member Groups**: Support for collaborative groups
2. **File Upload**: Actual file storage (not just metadata)
3. **Message Reactions**: Like/emoji reactions to messages
4. **Typing Indicators**: Real-time typing status
5. **Read Receipts**: Track message read status
6. **Learning Path Analytics**: Detailed progress reports
7. **Adaptive Learning**: AI-driven module recommendations
8. **Notification System**: Push notifications for events
9. **Rate Limiting**: Prevent abuse of real-time events
10. **Caching Layer**: Redis for performance optimization
