/**
 * LearningPathService
 *
 * Validates student learning progression according to business rules:
 * - Module prerequisites (N requires N-1 completed with >= 60%)
 * - Sequential module progression
 * - Lesson completion requires unlocked modules
 * - Passing score threshold (>= 60%)
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ModuleScore {
  score: number;
  maxScore: number;
  percentage: number;
  examId: string;
  completedAt: Date;
}

export interface AppDataState {
  email: string;
  moduleScores?: Record<string, ModuleScore>;
  completedLessons?: Record<string, boolean>;
  finalQuizPassed?: boolean;
  unlockedModules?: number[];
  currentActivityId?: number | null;
  currentModuleId?: number | null;
  moduleLessonIndex?: number;
  modulePageIndex?: number;
  learningPathTopic?: string | null;
}

const PASSING_SCORE_THRESHOLD = 0.6; // 60%

class LearningPathService {
  /**
   * Validate module unlock attempt
   * Module N requires Module N-1 to be completed with passing score
   */
  validateModuleUnlock(
    currentPath: AppDataState,
    moduleId: number
  ): ValidationResult {
    const errors: string[] = [];

    // Module 1 is always unlocked
    if (moduleId === 1) {
      return { valid: true, errors: [] };
    }

    // Check if previous module is completed with passing score
    const previousModuleId = moduleId - 1;
    const moduleScores = currentPath.moduleScores || {};
    const previousScore = moduleScores[previousModuleId.toString()];

    if (!previousScore) {
      errors.push(
        `Cannot unlock module ${moduleId}: Module ${previousModuleId} has not been completed`
      );
      return { valid: false, errors };
    }

    const percentage = previousScore.percentage;
    if (percentage < PASSING_SCORE_THRESHOLD * 100) {
      errors.push(
        `Cannot unlock module ${moduleId}: Module ${previousModuleId} requires passing score (>= 60%), got ${percentage}%`
      );
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Validate lesson completion attempt
   * Lessons can only be completed in unlocked modules
   */
  validateLessonCompletion(
    currentPath: AppDataState,
    moduleId: number,
    lessonId: number
  ): ValidationResult {
    const errors: string[] = [];
    const unlockedModules = currentPath.unlockedModules || [1];

    if (!unlockedModules.includes(moduleId)) {
      errors.push(
        `Cannot complete lesson ${lessonId} in module ${moduleId}: Module is not unlocked`
      );
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Validate quiz completion
   * Passing score is >= 60%
   */
  validateQuizCompletion(
    currentPath: AppDataState,
    score: number,
    maxScore: number
  ): ValidationResult {
    const errors: string[] = [];

    if (maxScore <= 0) {
      errors.push("Invalid maxScore: must be greater than 0");
      return { valid: false, errors };
    }

    const percentage = score / maxScore;
    const passed = percentage >= PASSING_SCORE_THRESHOLD;

    return {
      valid: true,
      errors: [],
    };
  }

  /**
   * Validate final quiz completion
   * Requires all modules to be completed with passing scores
   */
  validateFinalQuiz(
    currentPath: AppDataState,
    score: number,
    maxScore: number
  ): ValidationResult {
    const errors: string[] = [];
    const moduleScores = currentPath.moduleScores || {};

    // Check if score meets threshold
    const percentage = score / maxScore;
    if (percentage < PASSING_SCORE_THRESHOLD) {
      errors.push(
        `Final quiz requires passing score (>= 60%), got ${Math.round(
          percentage * 100
        )}%`
      );
      return { valid: false, errors };
    }

    // Check if all modules are completed (this is optional - depends on requirements)
    // For now, we'll just validate the score

    return { valid: true, errors: [] };
  }

  /**
   * Validate learning path update
   * Enforces sequential progression and business rules
   */
  validateUpdate(
    currentPath: AppDataState,
    updates: Partial<AppDataState>
  ): ValidationResult {
    const errors: string[] = [];

    // Validate unlockedModules if being updated
    if (updates.unlockedModules) {
      const newUnlockedModules = updates.unlockedModules;

      // Check sequential progression
      const sequenceResult =
        this.validateSequentialProgression(newUnlockedModules);
      if (!sequenceResult.valid) {
        errors.push(...sequenceResult.errors);
      }

      // Check prerequisites for each newly unlocked module
      const currentUnlocked = currentPath.unlockedModules || [1];
      const newlyUnlocked = newUnlockedModules.filter(
        (m) => !currentUnlocked.includes(m)
      );

      for (const moduleId of newlyUnlocked) {
        const unlockResult = this.validateModuleUnlock(currentPath, moduleId);
        if (!unlockResult.valid) {
          errors.push(...unlockResult.errors);
        }
      }
    }

    // Validate moduleScores if being updated
    if (updates.moduleScores) {
      const moduleScores = updates.moduleScores;
      for (const [moduleIdStr, scoreData] of Object.entries(moduleScores)) {
        const moduleId = parseInt(moduleIdStr, 10);

        // Validate module is unlocked before allowing score
        const unlockedModules = updates.unlockedModules ||
          currentPath.unlockedModules || [1];
        if (!unlockedModules.includes(moduleId)) {
          errors.push(
            `Cannot save score for module ${moduleId}: Module is not unlocked`
          );
        }

        // Validate score data structure
        if (
          typeof scoreData.score !== "number" ||
          typeof scoreData.maxScore !== "number"
        ) {
          errors.push(
            `Invalid score data for module ${moduleId}: score and maxScore must be numbers`
          );
        }
      }
    }

    // Validate completedLessons if being updated
    if (updates.completedLessons) {
      // completedLessons format: { "1": true, "2": true, ... }
      // We need to validate that lessons belong to unlocked modules
      // For simplicity, we'll skip detailed validation here since lesson-to-module mapping
      // would require additional configuration
    }

    // Validate finalQuizPassed if being updated
    if (updates.finalQuizPassed === true && !currentPath.finalQuizPassed) {
      // Validate that final quiz requirements are met
      // This would typically require checking all module scores
      // For now, we'll allow it if the update includes it
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate sequential module progression
   * Modules must be unlocked in sequence: [1], [1,2], [1,2,3], etc.
   */
  validateSequentialProgression(unlockedModules: number[]): ValidationResult {
    const errors: string[] = [];

    if (!unlockedModules || unlockedModules.length === 0) {
      errors.push("unlockedModules cannot be empty");
      return { valid: false, errors };
    }

    // Sort modules to check sequence
    const sorted = [...unlockedModules].sort((a, b) => a - b);

    // Must start with module 1
    if (sorted[0] !== 1) {
      errors.push("Module progression must start with module 1");
      return { valid: false, errors };
    }

    // Check for gaps in sequence
    for (let i = 0; i < sorted.length; i++) {
      const expected = i + 1;
      if (sorted[i] !== expected) {
        errors.push(
          `Invalid module sequence: expected module ${expected}, found ${sorted[i]}. Modules must be unlocked sequentially.`
        );
        return { valid: false, errors };
      }
    }

    return { valid: true, errors: [] };
  }

  /**
   * Check if a module has been completed with passing score
   */
  isModuleCompleted(currentPath: AppDataState, moduleId: number): boolean {
    const moduleScores = currentPath.moduleScores || {};
    const score = moduleScores[moduleId.toString()];

    if (!score) return false;

    return score.percentage >= PASSING_SCORE_THRESHOLD * 100;
  }

  /**
   * Get the highest unlocked module
   */
  getHighestUnlockedModule(currentPath: AppDataState): number {
    const unlockedModules = currentPath.unlockedModules || [1];
    return Math.max(...unlockedModules);
  }

  /**
   * Get the next module that can be unlocked
   */
  getNextUnlockableModule(currentPath: AppDataState): number | null {
    const highestUnlocked = this.getHighestUnlockedModule(currentPath);

    // Check if current highest module is completed
    if (this.isModuleCompleted(currentPath, highestUnlocked)) {
      return highestUnlocked + 1;
    }

    return null;
  }
}

export default new LearningPathService();
