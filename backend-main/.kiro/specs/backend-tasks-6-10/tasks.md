# Implementation Plan

- [x] 1. Set up Group model and validation schemas

  - Create Group model in models/Group.ts with single-member validation
  - Add group validation schemas to validators/schemas.ts (createGroupSchema, getGroupsQuerySchema)
  - Add indexes for members, type, and createdBy fields
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.1 Write property test for group creation

  - **Property 1: Group creation stores complete data**
  - **Validates: Requirements 1.1**

- [x] 1.2 Write property test for single-member validation

  - **Property 2: Single-type groups enforce exactly one member**
  - **Validates: Requirements 1.2, 1.3, 1.4**

- [x] 2. Implement Group endpoints

  - Create POST /api/groups endpoint with admin-only access
  - Implement single-member validation in endpoint handler
  - Create GET /api/groups endpoint with pagination
  - Add authentication and authorization middleware
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2.1 Write property test for group retrieval

  - **Property 3: Group retrieval returns all groups**
  - **Validates: Requirements 1.5**

- [x] 2.2 Write unit tests for group endpoints

  - Test group creation with valid data
  - Test single-member validation rejection
  - Test admin-only access control
  - Test group retrieval with pagination
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Enhance Message and ActivityFile models with groupId

  - Add groupId field to Message model (required, indexed)
  - Add groupId field to ActivityFile model (required, indexed)
  - Update model interfaces and schemas
  - _Requirements: 2.1, 2.3_

- [x] 3.1 Write property test for group association

  - **Property 4: Messages and files associate with sender's group**
  - **Validates: Requirements 2.1, 2.3**

- [x] 4. Implement GroupService for membership management

  - Create services/GroupService.ts
  - Implement getUserGroups(userUid) to get user's group IDs
  - Implement validateGroupMembership(userUid, groupId)
  - Implement getGroupsByMember(memberUid)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5. Update message and file endpoints with group filtering

  - Update POST /api/activity/message to require and validate groupId
  - Update POST /api/activity/file to require and validate groupId
  - Update GET /api/activity/message to filter by user's groups
  - Update GET /api/activity/file to filter by user's groups
  - Add validation for group membership before saving
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5.1 Write property test for access control

  - **Property 5: Group-based access control for messages and files**
  - **Validates: Requirements 2.2, 2.4**

- [x] 5.2 Write unit tests for message and file filtering

  - Test message creation with groupId
  - Test file creation with groupId
  - Test filtering by group membership
  - Test rejection of non-member access
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 6. Set up Socket.io for real-time communication

  - Add socket.io dependency to package.json
  - Create services/RealtimeService.ts
  - Initialize Socket.io server in server.ts
  - Implement authentication middleware for Socket.io
  - Implement room management (join/leave groups)
  - _Requirements: 2.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 7. Implement real-time message broadcasting

  - Update POST /api/activity/message to emit message:new event
  - Emit to group room using Socket.io
  - Include message data in event payload
  - _Requirements: 2.5_

- [ ] 7.1 Write property test for message broadcasting

  - **Property 6: Real-time message broadcasting to group members**
  - **Validates: Requirements 2.5**

- [ ] 7.2 Write unit tests for real-time messaging

  - Test Socket.io connection establishment
  - Test message broadcast to group members
  - Test event payload structure
  - _Requirements: 2.5_

- [x] 8. Implement login times endpoint

  - Create GET /api/login-times/:uid endpoint
  - Add admin-only authorization check
  - Return user info and loginTimes array
  - Add validation schema for uid parameter
  - _Requirements: 3.2, 3.3_

- [x] 8.1 Write property test for login timestamp recording

  - **Property 7: Login timestamps are recorded**
  - **Validates: Requirements 3.1**

- [x] 8.2 Write property test for admin retrieval

  - **Property 8: Admin retrieval of login times**
  - **Validates: Requirements 3.2**

- [x] 8.3 Write property test for access control

  - **Property 9: Non-admin access control for login times**
  - **Validates: Requirements 3.3**

- [x] 8.4 Write property test for chronological order

  - **Property 10: Login timestamps maintain chronological order**
  - **Validates: Requirements 3.4**

- [x] 8.5 Write unit tests for login times endpoint

  - Test admin can retrieve any user's login times
  - Test non-admin cannot access other users' login times
  - Test chronological ordering of timestamps
  - _Requirements: 3.2, 3.3, 3.4_

- [ ] 9. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Create LearningPathService for validation

  - Create services/LearningPathService.ts
  - Implement validateModuleUnlock(currentPath, moduleId)
  - Implement validateLessonCompletion(currentPath, moduleId, lessonId)
  - Implement validateQuizCompletion(currentPath, score, maxScore)
  - Implement validateUpdate(currentPath, updates)
  - Define module prerequisite rules (Module N requires Module N-1 completed)
  - Define passing score threshold (60%)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 10.1 Write property test for module unlock validation

  - **Property 11: Module unlock requires prerequisites**
  - **Validates: Requirements 4.1**

- [ ] 10.2 Write property test for lesson completion validation

  - **Property 12: Lesson completion requires unlocked module**
  - **Validates: Requirements 4.2**

- [ ] 10.3 Write property test for invalid update rejection

  - **Property 13: Invalid learning path updates are rejected**
  - **Validates: Requirements 4.3**

- [ ] 10.4 Write property test for quiz passing score

  - **Property 14: Final quiz requires passing score**
  - **Validates: Requirements 4.4**

- [ ] 10.5 Write property test for sequential progression

  - **Property 15: Module progression follows sequence**
  - **Validates: Requirements 4.5**

- [ ] 11. Integrate learning path validation into POST /api/appdata

  - Add LearningPathService validation before saving
  - Validate module unlocks against prerequisites
  - Validate lesson completions against unlocked modules
  - Validate quiz completion against passing score
  - Validate sequential module progression
  - Return detailed validation errors on failure
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 11.1 Write unit tests for learning path validation

  - Test valid module unlock (prerequisites met)
  - Test invalid module unlock (prerequisites not met)
  - Test valid lesson completion (module unlocked)
  - Test invalid lesson completion (module locked)
  - Test quiz passing with score >= 60%
  - Test quiz failing with score < 60%
  - Test sequential progression validation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 12. Implement admin update event emitters

  - Add emitExamUpdated(examData) to RealtimeService
  - Add emitNewsUpdated(newsData) to RealtimeService
  - Add emitGroupUpdated(groupId, groupData) to RealtimeService
  - Emit to appropriate rooms (all students for exam/news, group members for group)
  - Include updated data in event payload
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [ ] 13. Integrate event emitters into admin endpoints

  - Update exam update endpoint to emit exam:updated event
  - Update news update endpoint to emit news:updated event
  - Update group update endpoint to emit group:updated event
  - Ensure events are emitted after successful database updates
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 13.1 Write property test for broadcast to all students

  - **Property 16: Admin updates broadcast to all students**
  - **Validates: Requirements 5.1, 5.2**

- [ ] 13.2 Write property test for group-specific broadcast

  - **Property 17: Group updates broadcast to group members only**
  - **Validates: Requirements 5.3**

- [ ] 13.3 Write property test for WebSocket connection

  - **Property 18: WebSocket connection establishment**
  - **Validates: Requirements 5.4**

- [ ] 13.4 Write property test for event payloads

  - **Property 19: Event payloads contain updated data**
  - **Validates: Requirements 5.5**

- [ ] 13.5 Write unit tests for real-time admin updates

  - Test exam:updated event emission
  - Test news:updated event emission
  - Test group:updated event emission to correct recipients
  - Test event payload structure
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [ ] 14. Create data migration scripts

  - Create script to add groupId to existing messages (set to default group)
  - Create script to add groupId to existing files (set to default group)
  - Create script to create single-member groups for existing students
  - Document migration process in MIGRATION_GUIDE.md
  - _Requirements: 2.1, 2.3_

- [ ] 15. Update API documentation

  - Document POST /api/groups endpoint with examples
  - Document GET /api/groups endpoint with examples
  - Document GET /api/login-times/:uid endpoint with examples
  - Document enhanced message/file endpoints with groupId
  - Document Socket.io events and connection flow
  - Document learning path validation rules and errors
  - Create comprehensive API examples for all new features
  - _Requirements: All_

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
