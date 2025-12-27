# Requirements Document

## Introduction

This specification covers the remaining backend implementation tasks (Tasks 6-10) for the Adaptive Collaborative Learning Platform. These tasks complete the final requirements for group management, real-time communication, login tracking, learning path validation, and admin update broadcasting. The backend is built with TypeScript/Express.js, MongoDB, and Firebase Admin SDK for authentication.

## Glossary

- **Backend System**: The TypeScript/Express.js server application that handles API requests and manages data persistence
- **Admin User**: A user with administrative privileges, identified by matching the ADMIN_EMAIL environment variable
- **Student User**: A regular user with student role who can access learning materials and participate in groups
- **Group**: A collection entity that contains exactly one student member for individual learning tracking
- **Learning Path**: The progression of modules, lessons, and assessments that a student completes
- **Real-time Update**: An event broadcast via WebSocket that notifies connected clients immediately when data changes
- **Firebase ID Token**: An authentication token issued by Firebase Auth and verified by the backend
- **Login Timestamp**: A Date value recording when a user authenticated with the system
- **Module Score**: A numeric score associated with a specific module exam or assessment
- **Group Chat**: Text messages associated with a specific group and visible only to group members
- **File Metadata**: Information about an uploaded file including filename, URL, and uploader, stored without the actual file content
- **Activity ID**: A unique identifier linking messages and files to a specific learning activity
- **Socket.io**: A WebSocket library for real-time bidirectional communication between server and clients
- **Validation Rule**: A business logic constraint that determines whether a data update is permitted
- **Prerequisite**: A module or lesson that must be completed before another can be unlocked

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to create groups with exactly one student member, so that I can track individual student progress within a group structure.

#### Acceptance Criteria

1. WHEN an administrator creates a group THEN the Backend System SHALL store the group with a unique identifier, name, and members array
2. WHEN a group is created with type "single" THEN the Backend System SHALL enforce that the members array contains exactly one student identifier
3. WHEN a group is created with more than one member THEN the Backend System SHALL reject the request and return a validation error
4. WHEN a group is created with zero members THEN the Backend System SHALL reject the request and return a validation error
5. WHEN an administrator requests all groups THEN the Backend System SHALL return a list of all groups with their members and metadata

### Requirement 2

**User Story:** As a student, I want my chat messages to be visible only to members of my group, so that our discussions remain private and relevant.

#### Acceptance Criteria

1. WHEN a student sends a message THEN the Backend System SHALL associate the message with the student's group identifier
2. WHEN a student requests messages THEN the Backend System SHALL return only messages where the student is a member of the associated group
3. WHEN a student uploads file metadata THEN the Backend System SHALL associate the file with the student's group identifier
4. WHEN a student requests files THEN the Backend System SHALL return only files where the student is a member of the associated group
5. WHEN a message is sent to a group THEN the Backend System SHALL broadcast the message in real-time to all connected group members

### Requirement 3

**User Story:** As an administrator, I want to view all login timestamps for any student, so that I can monitor engagement and identify inactive users.

#### Acceptance Criteria

1. WHEN a student logs in THEN the Backend System SHALL record the login timestamp in the user's loginTimes array
2. WHEN an administrator requests login times for a specific user THEN the Backend System SHALL return all login timestamps for that user
3. WHEN a non-administrator requests login times for another user THEN the Backend System SHALL reject the request with a forbidden error
4. WHEN login timestamps are recorded THEN the Backend System SHALL maintain chronological order in the loginTimes array
5. WHEN multiple login mechanisms exist THEN the Backend System SHALL use a single unified approach to record timestamps

### Requirement 4

**User Story:** As a system administrator, I want to enforce learning path progression rules, so that students cannot skip prerequisites or unlock modules out of sequence.

#### Acceptance Criteria

1. WHEN a student attempts to unlock a module THEN the Backend System SHALL verify that all prerequisite modules have been completed
2. WHEN a student attempts to mark a lesson as complete THEN the Backend System SHALL verify that the lesson belongs to an unlocked module
3. WHEN a student submits invalid learning path data THEN the Backend System SHALL reject the update and return a detailed validation error
4. WHEN a student completes a final quiz THEN the Backend System SHALL verify the score meets the passing threshold before marking the quiz as passed
5. WHEN learning path data is updated THEN the Backend System SHALL validate that module progression follows the defined sequence

### Requirement 5

**User Story:** As a student, I want to receive real-time notifications when administrators update exams, news, or group information, so that I always have the latest information without refreshing.

#### Acceptance Criteria

1. WHEN an administrator updates an exam THEN the Backend System SHALL emit an "exam:updated" event to all connected students
2. WHEN an administrator updates news items THEN the Backend System SHALL emit a "news:updated" event to all connected students
3. WHEN an administrator updates a group THEN the Backend System SHALL emit a "group:updated" event to all members of that group
4. WHEN a student connects to the system THEN the Backend System SHALL establish a WebSocket connection for receiving real-time updates
5. WHEN a real-time event is emitted THEN the Backend System SHALL include the updated data payload in the event message
