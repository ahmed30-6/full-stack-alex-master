# Backend Tasks 6-10 Specification

## Overview

This specification covers the implementation of the remaining backend features (Tasks 6-10) for the Adaptive Collaborative Learning Platform. These tasks complete the final requirements for:

1. **Group Management** - Create and manage single-member groups
2. **Group-Based Communication** - Chat and file sharing restricted to group members
3. **Login Tracking** - Unified login timestamp recording and retrieval
4. **Learning Path Validation** - Enforce progression rules and prerequisites
5. **Real-Time Updates** - WebSocket-based broadcasting of admin changes

## Specification Documents

### 1. Requirements Document

**File:** `requirements.md`

Defines 5 main requirements with 25 acceptance criteria following EARS (Easy Approach to Requirements Syntax) patterns:

- **Requirement 1:** Group creation with single-member validation (5 criteria)
- **Requirement 2:** Group-based chat and file access control (5 criteria)
- **Requirement 3:** Login timestamp tracking and admin access (5 criteria)
- **Requirement 4:** Learning path progression validation (5 criteria)
- **Requirement 5:** Real-time admin update broadcasting (5 criteria)

### 2. Design Document

**File:** `design.md`

Comprehensive technical design including:

- **Architecture:** 5-layer system (API, Middleware, Service, Data, Real-time)
- **Components:** Group model, enhanced Message/ActivityFile models, service layer
- **Interfaces:** GroupService, LearningPathService, RealtimeService
- **Data Models:** Group schema, enhanced models with groupId
- **Correctness Properties:** 19 testable properties derived from requirements
- **Error Handling:** Standardized error responses and types
- **Testing Strategy:** Dual approach with unit tests and property-based tests
- **Security:** Authentication, authorization, input validation, data privacy
- **Performance:** Database optimization, real-time optimization, caching strategy

### 3. Implementation Tasks

**File:** `tasks.md`

Detailed task breakdown with 16 main tasks and 32 sub-tasks:

- **Tasks 1-2:** Group model and endpoints (5 sub-tasks)
- **Tasks 3-5:** Message/file enhancement with group filtering (4 sub-tasks)
- **Tasks 6-7:** Socket.io setup and real-time messaging (3 sub-tasks)
- **Task 8:** Login times endpoint (5 sub-tasks)
- **Tasks 9-11:** Learning path validation service and integration (7 sub-tasks)
- **Tasks 12-13:** Real-time admin update events (6 sub-tasks)
- **Tasks 14-16:** Migration, documentation, final testing (3 tasks)

All tasks include property-based tests and unit tests for comprehensive coverage.

## Key Features

### Group Management

- Create groups with exactly one member (single-type)
- Admin-only group creation and management
- Retrieve all groups with pagination
- Validation enforces single-member constraint

### Group-Based Access Control

- Messages associated with groupId
- Files associated with groupId
- Students only see messages/files from their groups
- Group membership validated before access

### Real-Time Communication

- Socket.io WebSocket connections
- Room-based event broadcasting
- Message broadcasting to group members
- Admin update events (exam, news, group)

### Login Tracking

- Unified login timestamp recording
- Admin endpoint to view any user's login times
- Chronological ordering maintained
- Access control (admin-only for other users)

### Learning Path Validation

- Module unlock requires prerequisites completed
- Lesson completion requires unlocked module
- Quiz passing requires 60% score
- Sequential module progression enforced
- Detailed validation errors returned

## Technology Stack

- **Runtime:** Node.js 25.x
- **Language:** TypeScript 5.9.3
- **Framework:** Express.js 4.21.2
- **Database:** MongoDB 6.21.0 (Mongoose 9.0.0)
- **Authentication:** Firebase Admin SDK 12.0.0
- **Validation:** Joi 17.11.0
- **Real-time:** Socket.io 4.x (new)
- **Testing:** Jest 29.x + fast-check (PBT)

## Testing Approach

### Property-Based Testing

- 19 correctness properties defined
- Each property tested with 100+ random inputs
- Uses fast-check library for generators
- Tests universal behaviors across all inputs

### Unit Testing

- Specific examples and edge cases
- Integration points (Socket.io, database)
- Error handling scenarios
- Access control validation

### Test Coverage

- All new endpoints have unit tests
- All correctness properties have PBT tests
- Integration tests for end-to-end flows
- Target: 80% coverage for new code

## API Endpoints

### New Endpoints

1. `POST /api/groups` - Create group (admin-only)
2. `GET /api/groups` - List all groups (admin-only)
3. `GET /api/login-times/:uid` - Get user login times (admin-only)

### Enhanced Endpoints

4. `POST /api/activity/message` - Now requires groupId
5. `POST /api/activity/file` - Now requires groupId
6. `GET /api/activity/message` - Filters by user's groups
7. `GET /api/activity/file` - Filters by user's groups
8. `POST /api/appdata` - Now validates learning path

### Socket.io Events

- **Client → Server:** `authenticate`, `join:group`, `leave:group`
- **Server → Client:** `exam:updated`, `news:updated`, `group:updated`, `message:new`

## Data Models

### New Models

- **Group:** name, type, members[], level, createdBy

### Enhanced Models

- **Message:** Added groupId field (required, indexed)
- **ActivityFile:** Added groupId field (required, indexed)

### Existing Models (Used)

- **User:** loginTimes array for tracking
- **AppDataModel:** Learning path state validation

## Migration Requirements

### Database Migrations

1. Add groupId to existing messages (default group)
2. Add groupId to existing files (default group)
3. Create single-member groups for existing students

### Environment Variables

```
SOCKET_IO_CORS_ORIGIN=http://localhost:3000,http://localhost:5173
LEARNING_PATH_PASSING_SCORE=0.6
```

## Implementation Workflow

Each task follows the established pattern from Tasks 1-5:

1. **One Task = One Branch**

   - Branch naming: `feature/backend-task-XX-short-name`
   - Example: `feature/backend-task-06-group-model-endpoints`

2. **Implementation Steps**

   - Write code for the task
   - Write property-based tests
   - Write unit tests
   - Ensure all tests pass
   - Create comprehensive documentation

3. **Pull Request**

   - Push branch to GitHub
   - Create PR with detailed description
   - Include testing steps and examples
   - Include TASK_XX_SUMMARY.md
   - Include PR_TASK_XX.md

4. **Review and Merge**
   - Request code review
   - Address feedback
   - Merge after approval
   - Move to next task

## Success Criteria

### Functional Requirements

- ✅ All 5 requirements fully implemented
- ✅ All 25 acceptance criteria met
- ✅ All 19 correctness properties validated

### Code Quality

- ✅ All tests passing (unit + property-based)
- ✅ 80%+ test coverage
- ✅ No TypeScript errors
- ✅ Consistent code style

### Documentation

- ✅ API documentation complete
- ✅ Migration guide provided
- ✅ Testing guide included
- ✅ PR descriptions detailed

### Security

- ✅ Authentication on all endpoints
- ✅ Authorization checks enforced
- ✅ Input validation comprehensive
- ✅ Access control validated

## Next Steps

To begin implementation:

1. Review all three specification documents
2. Start with Task 1 (Group model and validation)
3. Create branch: `feature/backend-task-06-group-model-endpoints`
4. Follow the implementation workflow
5. Complete tasks sequentially (1-16)

## Questions or Clarifications

If you have questions about:

- **Requirements:** Review `requirements.md` for acceptance criteria
- **Design:** Review `design.md` for technical details
- **Implementation:** Review `tasks.md` for step-by-step tasks
- **Testing:** Review design.md Testing Strategy section

## Related Documentation

- `BACKEND_ANALYSIS_REPORT.md` - Original backend analysis
- `TASK_01_SUMMARY.md` through `TASK_05_SUMMARY.md` - Previous task summaries
- `VALIDATION_GUIDE.md` - Input validation patterns
- `NORMALIZATION_GUIDE.md` - Data normalization patterns

---

**Specification Status:** ✅ Complete and Ready for Implementation

**Created:** December 12, 2024  
**Feature Name:** backend-tasks-6-10  
**Total Tasks:** 16 main tasks, 32 sub-tasks  
**Estimated Effort:** 5-7 days for full implementation
