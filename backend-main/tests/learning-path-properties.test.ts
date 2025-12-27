/**
 * Property-Based Tests for Learning Path Validation
 *
 * These tests verify correctness properties that should hold across all valid inputs.
 * Uses fast-check for property-based testing with 100+ iterations per property.
 */

import fc from "fast-check";
import LearningPathService, {
  AppDataState,
  ModuleScore,
} from "../services/LearningPathService";

describe("Learning Path Validation - Property Tests", () => {
  // Feature: backend-tasks-6-10, Property 11: Module unlock requires prerequisites
  describe("Property 11: Module unlock requires prerequisites", () => {
    it("should reject module unlock without completed prerequisite", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }), // moduleId to unlock
          fc.integer({ min: 0, max: 59 }), // failing score percentage
          (moduleId, failingPercentage) => {
            // Create state where previous module has failing score
            const currentPath: AppDataState = {
              email: "test@example.com",
              moduleScores: {
                [moduleId - 1]: {
                  score: failingPercentage,
                  maxScore: 100,
                  percentage: failingPercentage,
                  examId: `module-${moduleId - 1}-final`,
                  completedAt: new Date(),
                },
              },
              unlockedModules: [1],
            };

            const result = LearningPathService.validateModuleUnlock(
              currentPath,
              moduleId
            );

            // Should be rejected
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain("passing score");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should accept module unlock with completed prerequisite", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }), // moduleId to unlock
          fc.integer({ min: 60, max: 100 }), // passing score percentage
          (moduleId, passingPercentage) => {
            // Create state where previous module has passing score
            const currentPath: AppDataState = {
              email: "test@example.com",
              moduleScores: {
                [moduleId - 1]: {
                  score: passingPercentage,
                  maxScore: 100,
                  percentage: passingPercentage,
                  examId: `module-${moduleId - 1}-final`,
                  completedAt: new Date(),
                },
              },
              unlockedModules: [1],
            };

            const result = LearningPathService.validateModuleUnlock(
              currentPath,
              moduleId
            );

            // Should be accepted
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should always accept module 1 unlock", () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            moduleScores: fc.dictionary(fc.string(), fc.anything()),
            unlockedModules: fc.array(fc.integer({ min: 1, max: 10 })),
          }),
          (currentPath) => {
            const result = LearningPathService.validateModuleUnlock(
              currentPath as AppDataState,
              1
            );

            // Module 1 is always unlocked
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: backend-tasks-6-10, Property 12: Lesson completion requires unlocked module
  describe("Property 12: Lesson completion requires unlocked module", () => {
    it("should reject lesson completion in locked module", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }), // locked moduleId
          fc.integer({ min: 1, max: 20 }), // lessonId
          (moduleId, lessonId) => {
            const currentPath: AppDataState = {
              email: "test@example.com",
              unlockedModules: [1], // Only module 1 unlocked
            };

            const result = LearningPathService.validateLessonCompletion(
              currentPath,
              moduleId,
              lessonId
            );

            // Should be rejected
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain("not unlocked");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should accept lesson completion in unlocked module", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // moduleId
          fc.integer({ min: 1, max: 20 }), // lessonId
          (moduleId, lessonId) => {
            // Create unlocked modules array [1, 2, ..., moduleId]
            const unlockedModules = Array.from(
              { length: moduleId },
              (_, i) => i + 1
            );

            const currentPath: AppDataState = {
              email: "test@example.com",
              unlockedModules,
            };

            const result = LearningPathService.validateLessonCompletion(
              currentPath,
              moduleId,
              lessonId
            );

            // Should be accepted
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: backend-tasks-6-10, Property 13: Invalid learning path updates are rejected
  describe("Property 13: Invalid learning path updates are rejected", () => {
    it("should reject updates with non-sequential module progression", () => {
      fc.assert(
        fc.property(
          fc
            .array(fc.integer({ min: 1, max: 10 }), { minLength: 2 })
            .filter((arr) => {
              // Filter to only include non-sequential arrays
              const sorted = [...arr].sort((a, b) => a - b);
              for (let i = 0; i < sorted.length; i++) {
                if (sorted[i] !== i + 1) return true;
              }
              return false;
            }),
          (invalidModules) => {
            const currentPath: AppDataState = {
              email: "test@example.com",
              unlockedModules: [1],
            };

            const updates = {
              unlockedModules: invalidModules,
            };

            const result = LearningPathService.validateUpdate(
              currentPath,
              updates
            );

            // Should be rejected
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should accept updates with sequential module progression", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // number of modules
          (numModules) => {
            // Create sequential modules [1, 2, 3, ..., numModules]
            const sequentialModules = Array.from(
              { length: numModules },
              (_, i) => i + 1
            );

            // Create passing scores for all modules
            const moduleScores: Record<string, ModuleScore> = {};
            for (let i = 1; i < numModules; i++) {
              moduleScores[i.toString()] = {
                score: 70,
                maxScore: 100,
                percentage: 70,
                examId: `module-${i}-final`,
                completedAt: new Date(),
              };
            }

            const currentPath: AppDataState = {
              email: "test@example.com",
              unlockedModules: [1],
              moduleScores,
            };

            const updates = {
              unlockedModules: sequentialModules,
            };

            const result = LearningPathService.validateUpdate(
              currentPath,
              updates
            );

            // Should be accepted
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject module score updates for locked modules", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }), // locked moduleId
          fc.integer({ min: 0, max: 100 }), // score
          (moduleId, score) => {
            const currentPath: AppDataState = {
              email: "test@example.com",
              unlockedModules: [1], // Only module 1 unlocked
            };

            const updates = {
              moduleScores: {
                [moduleId]: {
                  score,
                  maxScore: 100,
                  percentage: score,
                  examId: `module-${moduleId}-final`,
                  completedAt: new Date(),
                },
              },
            };

            const result = LearningPathService.validateUpdate(
              currentPath,
              updates
            );

            // Should be rejected
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain("not unlocked");
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: backend-tasks-6-10, Property 14: Final quiz requires passing score
  describe("Property 14: Final quiz requires passing score", () => {
    it("should reject final quiz with failing score", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 59 }), // failing score
          fc.constant(100), // maxScore fixed at 100
          (score, maxScore) => {
            const currentPath: AppDataState = {
              email: "test@example.com",
            };

            const result = LearningPathService.validateFinalQuiz(
              currentPath,
              score,
              maxScore
            );

            // Should be rejected
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain("passing score");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should accept final quiz with passing score", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 60, max: 100 }), // passing score
          fc.constant(100), // maxScore
          (score, maxScore) => {
            const currentPath: AppDataState = {
              email: "test@example.com",
            };

            const result = LearningPathService.validateFinalQuiz(
              currentPath,
              score,
              maxScore
            );

            // Should be accepted
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: backend-tasks-6-10, Property 15: Module progression follows sequence
  describe("Property 15: Module progression follows sequence", () => {
    it("should reject non-sequential module arrays", () => {
      fc.assert(
        fc.property(
          fc
            .array(fc.integer({ min: 1, max: 10 }), {
              minLength: 2,
              maxLength: 10,
            })
            .filter((arr) => {
              // Only test arrays that are NOT sequential
              const sorted = [...new Set(arr)].sort((a, b) => a - b);
              if (sorted[0] !== 1) return true; // Doesn't start with 1
              for (let i = 0; i < sorted.length; i++) {
                if (sorted[i] !== i + 1) return true; // Has gaps
              }
              return false;
            }),
          (modules) => {
            const result =
              LearningPathService.validateSequentialProgression(modules);

            // Should be rejected
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should accept sequential module arrays", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // number of modules
          (numModules) => {
            const sequentialModules = Array.from(
              { length: numModules },
              (_, i) => i + 1
            );

            const result =
              LearningPathService.validateSequentialProgression(
                sequentialModules
              );

            // Should be accepted
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject empty module arrays", () => {
      const result = LearningPathService.validateSequentialProgression([]);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("cannot be empty");
    });

    it("should reject module arrays not starting with 1", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }), // starting module (not 1)
          fc.integer({ min: 1, max: 5 }), // length
          (start, length) => {
            const modules = Array.from({ length }, (_, i) => start + i);

            const result =
              LearningPathService.validateSequentialProgression(modules);

            // Should be rejected
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain("start with module 1");
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional helper method tests
  describe("Helper Methods", () => {
    it("should correctly identify completed modules", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // moduleId
          fc.integer({ min: 60, max: 100 }), // passing percentage
          (moduleId, percentage) => {
            const currentPath: AppDataState = {
              email: "test@example.com",
              moduleScores: {
                [moduleId]: {
                  score: percentage,
                  maxScore: 100,
                  percentage,
                  examId: `module-${moduleId}-final`,
                  completedAt: new Date(),
                },
              },
            };

            const isCompleted = LearningPathService.isModuleCompleted(
              currentPath,
              moduleId
            );

            expect(isCompleted).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should correctly identify incomplete modules", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // moduleId
          fc.integer({ min: 0, max: 59 }), // failing percentage
          (moduleId, percentage) => {
            const currentPath: AppDataState = {
              email: "test@example.com",
              moduleScores: {
                [moduleId]: {
                  score: percentage,
                  maxScore: 100,
                  percentage,
                  examId: `module-${moduleId}-final`,
                  completedAt: new Date(),
                },
              },
            };

            const isCompleted = LearningPathService.isModuleCompleted(
              currentPath,
              moduleId
            );

            expect(isCompleted).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return highest unlocked module", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // max module
          (maxModule) => {
            const unlockedModules = Array.from(
              { length: maxModule },
              (_, i) => i + 1
            );

            const currentPath: AppDataState = {
              email: "test@example.com",
              unlockedModules,
            };

            const highest =
              LearningPathService.getHighestUnlockedModule(currentPath);

            expect(highest).toBe(maxModule);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
