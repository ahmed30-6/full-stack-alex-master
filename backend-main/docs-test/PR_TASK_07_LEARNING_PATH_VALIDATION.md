# PR: Task 7 - Learning Path Validation

## Description

This PR implements comprehensive validation for student learning progression, ensuring proper sequential module advancement, prerequisite completion, and passing score requirements. The implementation introduces `LearningPathService` with business logic validation integrated into the existing `/api/appdata` endpoint.

## Changes

### New Files

1. **`services/LearningPathService.ts`** - Core validation service

   - Module unlock validation (requires prerequisites)
   - Lesson completion validation (requires unlocked modules)
   - Quiz completion validation (60% passing threshold)
   - Sequential progression validation
   - Helper methods for state queries

2. **`tests/learning-path-properties.test.ts`** - Property-based tests

   - 17 property tests with 100+ iterations each
   - Validates Properties 11-15 from design document
   - Uses fast-check for random data generation

3. **`tests/learning-path.test.ts`** - Unit tests
   - 36 unit tests covering all validation methods
   - Edge cases and error conditions
   - Helper method validation

### Modified Files

1. **`server.ts`**

   - Enhanced POST /api/appdata with validation
   - Fetches current state before updates
   - Validates updates using LearningPathService
   - Returns detailed validation errors

2. **`services/index.ts`**
   - Exported LearningPathService

## Validation Rules

### Module Prerequisites

- Module 1 is always unlocked
- Module N requires Module N-1 completed with >= 60% score
- Modules must be unlocked sequentially (no skipping)

### Lesson Completion

- Lessons can only be completed in unlocked modules
- Locked module lessons are rejected

### Quiz Completion

- Passing score threshold: 60% (0.6)
- Final quiz requires >= 60% to pass
- Score data validated for integrity

### Sequential Progression

- unlockedModules must be sequential: [1], [1,2], [1,2,3]
- Cannot skip modules: [1,3] is invalid
- Must start with module 1

## API Changes

### POST /api/appdata

**Enhanced Behavior:**

- Validates learning path updates before saving
- Returns 400 with detailed errors if validation fails

**Error Response:**

```json
{
  "success": false,
  "error": "Learning path validation failed",
  "details": [
    "Cannot unlock module 2: Module 1 requires passing score (>= 60%), got 50%"
  ]
}
```

**Success Response:** (unchanged)

```json
{
  "appData": { ... }
}
```

## Testing

### Unit Tests (36 tests)

```bash
npm test -- tests/learning-path.test.ts
```

**Coverage:**

- ✅ Module unlock validation (5 tests)
- ✅ Lesson completion validation (3 tests)
- ✅ Quiz completion validation (3 tests)
- ✅ Final quiz validation (3 tests)
- ✅ Update validation (6 tests)
- ✅ Sequential progression (6 tests)
- ✅ Helper methods (10 tests)

### Property-Based Tests (17 tests)

```bash
npm test -- tests/learning-path-properties.test.ts
```

**Coverage:**

- ✅ Property 11: Module unlock requires prerequisites
- ✅ Property 12: Lesson completion requires unlocked module
- ✅ Property 13: Invalid learning path updates are rejected
- ✅ Property 14: Final quiz requires passing score
- ✅ Property 15: Module progression follows sequence

### Test Results

```
✓ All 53 tests passing
✓ 100+ iterations per property test
✓ No diagnostics or type errors
```

## Examples

### Valid Progression

```javascript
// Student completes module 1 with 75%
POST /api/appdata
{
  "moduleScores": {
    "1": { "score": 75, "maxScore": 100, "percentage": 75 }
  },
  "unlockedModules": [1, 2]
}
// ✓ Accepted - Module 2 unlocked
```

### Invalid: Skipping Module

```javascript
POST /api/appdata
{
  "unlockedModules": [1, 3]  // Skipping module 2
}
// ✗ Rejected: "Invalid module sequence: expected module 2, found 3"
```

### Invalid: Failing Score

```javascript
POST /api/appdata
{
  "moduleScores": {
    "1": { "score": 50, "maxScore": 100, "percentage": 50 }
  },
  "unlockedModules": [1, 2]
}
// ✗ Rejected: "Cannot unlock module 2: Module 1 requires passing score (>= 60%), got 50%"
```

### Invalid: Locked Module Lesson

```javascript
POST /api/appdata
{
  "completedLessons": { "5": true },  // Lesson in module 2
  "unlockedModules": [1]  // Only module 1 unlocked
}
// ✗ Rejected: "Cannot complete lesson 5 in module 2: Module is not unlocked"
```

## Validation Methods

### LearningPathService API

```typescript
// Validate module unlock
validateModuleUnlock(currentPath: AppDataState, moduleId: number): ValidationResult

// Validate lesson completion
validateLessonCompletion(currentPath: AppDataState, moduleId: number, lessonId: number): ValidationResult

// Validate quiz completion
validateQuizCompletion(currentPath: AppDataState, score: number, maxScore: number): ValidationResult

// Validate final quiz
validateFinalQuiz(currentPath: AppDataState, score: number, maxScore: number): ValidationResult

// Validate complete update
validateUpdate(currentPath: AppDataState, updates: Partial<AppDataState>): ValidationResult

// Validate sequential progression
validateSequentialProgression(unlockedModules: number[]): ValidationResult

// Helper: Check if module completed
isModuleCompleted(currentPath: AppDataState, moduleId: number): boolean

// Helper: Get highest unlocked module
getHighestUnlockedModule(currentPath: AppDataState): number

// Helper: Get next unlockable module
getNextUnlockableModule(currentPath: AppDataState): number | null
```

## Error Messages

The service provides detailed, user-friendly error messages:

- "Cannot unlock module 2: Module 1 has not been completed"
- "Cannot unlock module 2: Module 1 requires passing score (>= 60%), got 50%"
- "Cannot complete lesson 5 in module 2: Module is not unlocked"
- "Cannot save score for module 3: Module is not unlocked"
- "Invalid module sequence: expected module 2, found 3. Modules must be unlocked sequentially."
- "Module progression must start with module 1"
- "unlockedModules cannot be empty"
- "Invalid score data for module 2: score and maxScore must be numbers"
- "Final quiz requires passing score (>= 60%), got 45%"

## Breaking Changes

None. This is a backward-compatible enhancement:

- Existing valid updates continue to work
- Only invalid updates (that violate business rules) are now rejected
- Error responses follow existing format

## Security

- ✅ Server-side validation (cannot be bypassed)
- ✅ Current state fetched from database
- ✅ All updates validated before persistence
- ✅ No client-side trust required

## Performance

- ✅ Lightweight validation (< 1ms)
- ✅ Single database query for current state
- ✅ No additional database queries
- ✅ In-memory validation operations

## Documentation

- ✅ TASK_07_SUMMARY.md - Implementation summary
- ✅ PR_TASK_07_LEARNING_PATH_VALIDATION.md - This PR document
- ✅ Inline code documentation
- ✅ Test documentation

## Checklist

- [x] Code implemented and tested
- [x] Unit tests passing (36/36)
- [x] Property tests passing (17/17)
- [x] No TypeScript errors
- [x] No linting issues
- [x] Documentation complete
- [x] Error messages clear and helpful
- [x] Backward compatible
- [x] Security validated
- [x] Performance acceptable

## Related Requirements

This PR implements the following requirements from the design document:

- **Requirement 7.1**: Create LearningPathService with validation methods ✅
- **Requirement 7.2**: Add Property Tests 11-15 ✅
- **Requirement 7.3**: Integrate validation into POST /api/appdata ✅
- **Requirement 7.4**: Add Unit Tests ✅
- **Requirement 7.5**: Documentation ✅

## Correctness Properties Validated

- **Property 11**: Module unlock requires prerequisites ✅
- **Property 12**: Lesson completion requires unlocked module ✅
- **Property 13**: Invalid learning path updates are rejected ✅
- **Property 14**: Final quiz requires passing score ✅
- **Property 15**: Module progression follows sequence ✅

## Review Notes

### Key Points

1. All validation is server-side and cannot be bypassed
2. Detailed error messages help students understand requirements
3. 60% passing threshold is configurable (PASSING_SCORE_THRESHOLD constant)
4. Sequential progression is strictly enforced
5. Module 1 is always unlocked for new students

### Testing Strategy

- Unit tests cover specific examples and edge cases
- Property tests verify universal correctness across random inputs
- 100+ iterations per property ensure comprehensive coverage

### Future Enhancements

- Configurable passing score threshold via environment variable
- Support for non-linear module dependencies
- Quiz retry limits
- Time-based module unlocks
- Adaptive learning based on performance

## Deployment Notes

No special deployment steps required:

1. Merge to main branch
2. Deploy as normal
3. Existing data remains valid
4. New validation applies to future updates only

## Branch

`feature/backend-task-11-learning-path-validation`

## Merge Strategy

Squash and merge recommended to keep history clean.
