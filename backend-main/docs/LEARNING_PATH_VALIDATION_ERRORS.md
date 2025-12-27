# Learning Path Validation Errors

## Overview

This document provides a comprehensive guide to all validation errors that can occur when updating learning path data via `POST /api/appdata`.

## Validation Rules

### Module Unlock Rules

1. **Module 1 is always unlocked**

   - New students start with module 1 available
   - Cannot be locked

2. **Module N requires Module N-1 completed**

   - Must complete previous module before unlocking next
   - Completion means score >= 60%

3. **Sequential progression only**
   - Modules must be unlocked in order: [1], [1,2], [1,2,3]
   - Cannot skip modules: [1,3] is invalid

### Lesson Completion Rules

1. **Lessons require unlocked modules**
   - Can only complete lessons in unlocked modules
   - Attempting to complete lessons in locked modules is rejected

### Quiz Completion Rules

1. **Passing score threshold: 60%**

   - Score / maxScore >= 0.6 required to pass
   - Failing scores don't unlock next module

2. **Final quiz requires all modules completed**
   - Must complete all modules before final quiz
   - Final quiz requires >= 60% to pass

## Error Response Format

When validation fails, the API returns:

```json
{
  "success": false,
  "error": "Learning path validation failed",
  "details": ["Error message 1", "Error message 2"]
}
```

**HTTP Status Code:** `400 Bad Request`

## Common Validation Errors

### 1. Module Not Completed

**Error Message:**

```
Cannot unlock module 2: Module 1 has not been completed
```

**Cause:**

- Attempting to unlock module 2 without completing module 1
- No score recorded for module 1

**Solution:**

```javascript
// First, complete module 1
POST /api/appdata
{
  "moduleScores": {
    "1": {
      "score": 75,
      "maxScore": 100,
      "percentage": 75,
      "examId": "module-1-final",
      "completedAt": "2024-12-13T10:00:00.000Z"
    }
  },
  "unlockedModules": [1]
}

// Then, unlock module 2
POST /api/appdata
{
  "unlockedModules": [1, 2]
}
```

### 2. Failing Score

**Error Message:**

```
Cannot unlock module 2: Module 1 requires passing score (>= 60%), got 50%
```

**Cause:**

- Module 1 score is below 60%
- Attempting to unlock module 2

**Solution:**

```javascript
// Retake module 1 exam and get >= 60%
POST /api/scores
{
  "studentUid": "user-123",
  "examId": "module-1-final",
  "score": 70,
  "maxScore": 100
}

// Then update learning path
POST /api/appdata
{
  "moduleScores": {
    "1": {
      "score": 70,
      "maxScore": 100,
      "percentage": 70,
      "examId": "module-1-final",
      "completedAt": "2024-12-13T11:00:00.000Z"
    }
  },
  "unlockedModules": [1, 2]
}
```

### 3. Non-Sequential Progression

**Error Message:**

```
Invalid module sequence: expected module 2, found 3. Modules must be unlocked sequentially.
```

**Cause:**

- Attempting to unlock module 3 without unlocking module 2
- Skipping modules in progression

**Solution:**

```javascript
// ❌ Invalid: Skipping module 2
POST /api/appdata
{
  "unlockedModules": [1, 3]
}

// ✅ Valid: Sequential progression
POST /api/appdata
{
  "unlockedModules": [1, 2]
}

// Then after completing module 2
POST /api/appdata
{
  "unlockedModules": [1, 2, 3]
}
```

### 4. Module Not Starting with 1

**Error Message:**

```
Module progression must start with module 1
```

**Cause:**

- Attempting to set unlockedModules without module 1
- Invalid module array

**Solution:**

```javascript
// ❌ Invalid: Not starting with 1
POST /api/appdata
{
  "unlockedModules": [2, 3]
}

// ✅ Valid: Starting with 1
POST /api/appdata
{
  "unlockedModules": [1, 2, 3]
}
```

### 5. Empty Module Array

**Error Message:**

```
unlockedModules cannot be empty
```

**Cause:**

- Attempting to set unlockedModules to empty array
- Module 1 must always be unlocked

**Solution:**

```javascript
// ❌ Invalid: Empty array
POST /api/appdata
{
  "unlockedModules": []
}

// ✅ Valid: At least module 1
POST /api/appdata
{
  "unlockedModules": [1]
}
```

### 6. Score for Locked Module

**Error Message:**

```
Cannot save score for module 2: Module is not unlocked
```

**Cause:**

- Attempting to save score for module 2
- Module 2 is not in unlockedModules array

**Solution:**

```javascript
// First, unlock module 2
POST /api/appdata
{
  "unlockedModules": [1, 2]
}

// Then save score
POST /api/appdata
{
  "moduleScores": {
    "2": {
      "score": 80,
      "maxScore": 100,
      "percentage": 80,
      "examId": "module-2-final",
      "completedAt": "2024-12-13T12:00:00.000Z"
    }
  }
}
```

### 7. Invalid Score Data

**Error Message:**

```
Invalid score data for module 1: score and maxScore must be numbers
```

**Cause:**

- Score or maxScore is not a number
- Invalid data type

**Solution:**

```javascript
// ❌ Invalid: String instead of number
POST /api/appdata
{
  "moduleScores": {
    "1": {
      "score": "75",  // Should be number
      "maxScore": "100"
    }
  }
}

// ✅ Valid: Numbers
POST /api/appdata
{
  "moduleScores": {
    "1": {
      "score": 75,
      "maxScore": 100,
      "percentage": 75,
      "examId": "module-1-final",
      "completedAt": "2024-12-13T10:00:00.000Z"
    }
  }
}
```

### 8. Lesson in Locked Module

**Error Message:**

```
Cannot complete lesson 5 in module 2: Module is not unlocked
```

**Cause:**

- Attempting to complete lesson in module 2
- Module 2 is not unlocked

**Solution:**

```javascript
// First, unlock module 2
POST /api/appdata
{
  "unlockedModules": [1, 2]
}

// Then complete lesson
POST /api/appdata
{
  "completedLessons": {
    "5": true
  }
}
```

### 9. Final Quiz Without Prerequisites

**Error Message:**

```
Final quiz requires passing score (>= 60%), got 45%
```

**Cause:**

- Final quiz score below 60%
- Attempting to set finalQuizPassed to true

**Solution:**

```javascript
// Retake final quiz and get >= 60%
POST /api/scores
{
  "studentUid": "user-123",
  "examId": "final-quiz",
  "score": 70,
  "maxScore": 100
}

// Then update learning path
POST /api/appdata
{
  "finalQuizPassed": true
}
```

## Validation Flow

### Successful Progression

```javascript
// Step 1: Start with module 1
POST /api/appdata
{
  "unlockedModules": [1]
}
// ✅ Success

// Step 2: Complete module 1 with passing score
POST /api/appdata
{
  "moduleScores": {
    "1": {
      "score": 75,
      "maxScore": 100,
      "percentage": 75,
      "examId": "module-1-final",
      "completedAt": "2024-12-13T10:00:00.000Z"
    }
  }
}
// ✅ Success

// Step 3: Unlock module 2
POST /api/appdata
{
  "unlockedModules": [1, 2]
}
// ✅ Success (module 1 has passing score)

// Step 4: Complete module 2
POST /api/appdata
{
  "moduleScores": {
    "2": {
      "score": 80,
      "maxScore": 100,
      "percentage": 80,
      "examId": "module-2-final",
      "completedAt": "2024-12-13T11:00:00.000Z"
    }
  }
}
// ✅ Success

// Step 5: Unlock module 3
POST /api/appdata
{
  "unlockedModules": [1, 2, 3]
}
// ✅ Success (module 2 has passing score)
```

### Failed Progression

```javascript
// Attempt to skip module 2
POST /api/appdata
{
  "unlockedModules": [1, 3]
}
// ❌ Error: "Invalid module sequence: expected module 2, found 3"

// Attempt to unlock without prerequisite
POST /api/appdata
{
  "unlockedModules": [1, 2]
}
// ❌ Error: "Cannot unlock module 2: Module 1 has not been completed"

// Attempt to unlock with failing score
POST /api/appdata
{
  "moduleScores": {
    "1": {
      "score": 50,
      "maxScore": 100,
      "percentage": 50
    }
  },
  "unlockedModules": [1, 2]
}
// ❌ Error: "Cannot unlock module 2: Module 1 requires passing score (>= 60%), got 50%"
```

## Error Handling in Client

### React Example

```javascript
async function updateLearningPath(updates) {
  try {
    const response = await fetch("/api/appdata", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      if (
        response.status === 400 &&
        data.error === "Learning path validation failed"
      ) {
        // Handle validation errors
        console.error("Validation errors:", data.details);

        // Show errors to user
        data.details.forEach((error) => {
          showError(error);
        });

        return { success: false, errors: data.details };
      }

      throw new Error(data.error || "Failed to update learning path");
    }

    return { success: true, data: data.appData };
  } catch (error) {
    console.error("Error updating learning path:", error);
    showError("Failed to update learning path. Please try again.");
    return { success: false, error: error.message };
  }
}

// Usage
const result = await updateLearningPath({
  unlockedModules: [1, 2],
});

if (!result.success) {
  // Handle errors
  result.errors?.forEach((error) => {
    if (error.includes("has not been completed")) {
      showMessage("Please complete the previous module first");
    } else if (error.includes("passing score")) {
      showMessage("You need at least 60% to unlock the next module");
    } else if (error.includes("sequentially")) {
      showMessage("Modules must be completed in order");
    }
  });
}
```

### Vue Example

```javascript
async updateLearningPath(updates) {
  try {
    const response = await this.$http.post('/api/appdata', updates);
    this.learningPath = response.data.appData;
    this.$toast.success('Learning path updated');
  } catch (error) {
    if (error.response?.status === 400) {
      const details = error.response.data.details;
      if (Array.isArray(details)) {
        details.forEach(msg => {
          this.$toast.error(msg);
        });
      } else {
        this.$toast.error(error.response.data.error);
      }
    } else {
      this.$toast.error('Failed to update learning path');
    }
  }
}
```

## Best Practices

### 1. Validate Before Submitting

```javascript
// Check prerequisites before attempting unlock
function canUnlockModule(currentPath, moduleId) {
  if (moduleId === 1) return true;

  const previousModule = moduleId - 1;
  const score = currentPath.moduleScores[previousModule];

  if (!score) return false;
  if (score.percentage < 60) return false;

  return true;
}

// Use before API call
if (canUnlockModule(learningPath, 2)) {
  await updateLearningPath({ unlockedModules: [1, 2] });
} else {
  showError("Complete module 1 with at least 60% first");
}
```

### 2. Show Clear Error Messages

```javascript
function formatValidationError(error) {
  if (error.includes("has not been completed")) {
    return "Please complete the previous module before continuing";
  } else if (error.includes("passing score")) {
    const match = error.match(/got (\d+)%/);
    const score = match ? match[1] : "your";
    return `You scored ${score}%. You need at least 60% to continue.`;
  } else if (error.includes("sequentially")) {
    return "Modules must be completed in order. You cannot skip ahead.";
  } else {
    return error;
  }
}
```

### 3. Handle Retries

```javascript
async function updateWithRetry(updates, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await updateLearningPath(updates);
    } catch (error) {
      if (error.response?.status === 400) {
        // Validation error - don't retry
        throw error;
      }

      if (i === maxRetries - 1) throw error;

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## Testing Validation

### Test Cases

```javascript
describe("Learning Path Validation", () => {
  it("should allow unlocking module 1", async () => {
    const result = await updateLearningPath({
      unlockedModules: [1],
    });
    expect(result.success).toBe(true);
  });

  it("should reject unlocking module 2 without completing module 1", async () => {
    const result = await updateLearningPath({
      unlockedModules: [1, 2],
    });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("has not been completed");
  });

  it("should reject unlocking module 2 with failing score", async () => {
    await updateLearningPath({
      moduleScores: {
        1: { score: 50, maxScore: 100, percentage: 50 },
      },
    });

    const result = await updateLearningPath({
      unlockedModules: [1, 2],
    });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("passing score");
  });

  it("should allow unlocking module 2 with passing score", async () => {
    await updateLearningPath({
      moduleScores: {
        1: { score: 75, maxScore: 100, percentage: 75 },
      },
    });

    const result = await updateLearningPath({
      unlockedModules: [1, 2],
    });
    expect(result.success).toBe(true);
  });

  it("should reject skipping modules", async () => {
    const result = await updateLearningPath({
      unlockedModules: [1, 3],
    });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("sequentially");
  });
});
```

## Additional Resources

- [API Reference](./API_REFERENCE.md)
- [Learning Path Service](./TASK_07_SUMMARY.md)
- [Scores & Learning Path API](./SCORES_LEARNING_PATH_API.md)
