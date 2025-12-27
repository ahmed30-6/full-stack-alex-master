/**
 * Unit Tests for Learning Path Validation
 *
 * Tests specific examples, edge cases, and error conditions
 */

import LearningPathService, {
  AppDataState,
  ModuleScore,
} from "../services/LearningPathService";

describe("LearningPathService - Unit Tests", () => {
  describe("validateModuleUnlock", () => {
    it("should allow unlocking module 1", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
        unlockedModules: [],
      };

      const result = LearningPathService.validateModuleUnlock(currentPath, 1);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should allow unlocking module 2 when module 1 is completed with passing score", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
        moduleScores: {
          "1": {
            score: 75,
            maxScore: 100,
            percentage: 75,
            examId: "module-1-final",
            completedAt: new Date(),
          },
        },
        unlockedModules: [1],
      };

      const result = LearningPathService.validateModuleUnlock(currentPath, 2);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should reject unlocking module 2 when module 1 has failing score", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
        moduleScores: {
          "1": {
            score: 50,
            maxScore: 100,
            percentage: 50,
            examId: "module-1-final",
            completedAt: new Date(),
          },
        },
        unlockedModules: [1],
      };

      const result = LearningPathService.validateModuleUnlock(currentPath, 2);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("passing score");
      expect(result.errors[0]).toContain("60%");
    });

    it("should reject unlocking module 2 when module 1 is not completed", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
        moduleScores: {},
        unlockedModules: [1],
      };

      const result = LearningPathService.validateModuleUnlock(currentPath, 2);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("has not been completed");
    });

    it("should allow unlocking module with exactly 60% score", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
        moduleScores: {
          "1": {
            score: 60,
            maxScore: 100,
            percentage: 60,
            examId: "module-1-final",
            completedAt: new Date(),
          },
        },
        unlockedModules: [1],
      };

      const result = LearningPathService.validateModuleUnlock(currentPath, 2);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("validateLessonCompletion", () => {
    it("should allow lesson completion in unlocked module", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
        unlockedModules: [1, 2],
      };

      const result = LearningPathService.validateLessonCompletion(
        currentPath,
        2,
        5
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should reject lesson completion in locked module", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
        unlockedModules: [1],
      };

      const result = LearningPathService.validateLessonCompletion(
        currentPath,
        2,
        5
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("not unlocked");
    });

    it("should allow lesson completion in module 1 (always unlocked)", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
        unlockedModules: [1],
      };

      const result = LearningPathService.validateLessonCompletion(
        currentPath,
        1,
        1
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("validateQuizCompletion", () => {
    it("should validate passing quiz score", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
      };

      const result = LearningPathService.validateQuizCompletion(
        currentPath,
        75,
        100
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should validate failing quiz score", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
      };

      const result = LearningPathService.validateQuizCompletion(
        currentPath,
        50,
        100
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should reject invalid maxScore", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
      };

      const result = LearningPathService.validateQuizCompletion(
        currentPath,
        50,
        0
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("maxScore");
    });
  });

  describe("validateFinalQuiz", () => {
    it("should accept final quiz with passing score", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
      };

      const result = LearningPathService.validateFinalQuiz(
        currentPath,
        70,
        100
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should reject final quiz with failing score", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
      };

      const result = LearningPathService.validateFinalQuiz(
        currentPath,
        50,
        100
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("passing score");
    });

    it("should accept final quiz with exactly 60% score", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
      };

      const result = LearningPathService.validateFinalQuiz(
        currentPath,
        60,
        100
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("validateUpdate", () => {
    it("should accept valid sequential module progression", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
        unlockedModules: [1],
        moduleScores: {
          "1": {
            score: 75,
            maxScore: 100,
            percentage: 75,
            examId: "module-1-final",
            completedAt: new Date(),
          },
        },
      };

      const updates = {
        unlockedModules: [1, 2],
      };

      const result = LearningPathService.validateUpdate(currentPath, updates);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should reject non-sequential module progression", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
        unlockedModules: [1],
        moduleScores: {},
      };

      const updates = {
        unlockedModules: [1, 3], // Skipping module 2
      };

      const result = LearningPathService.validateUpdate(currentPath, updates);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject unlocking module without prerequisite", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
        unlockedModules: [1],
        moduleScores: {}, // No scores
      };

      const updates = {
        unlockedModules: [1, 2],
      };

      const result = LearningPathService.validateUpdate(currentPath, updates);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("has not been completed");
    });

    it("should reject module score for locked module", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
        unlockedModules: [1],
      };

      const updates = {
        moduleScores: {
          "2": {
            score: 75,
            maxScore: 100,
            percentage: 75,
            examId: "module-2-final",
            completedAt: new Date(),
          },
        },
      };

      const result = LearningPathService.validateUpdate(currentPath, updates);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("not unlocked");
    });

    it("should accept module score for unlocked module", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
        unlockedModules: [1, 2],
      };

      const updates = {
        moduleScores: {
          "2": {
            score: 75,
            maxScore: 100,
            percentage: 75,
            examId: "module-2-final",
            completedAt: new Date(),
          },
        },
      };

      const result = LearningPathService.validateUpdate(currentPath, updates);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should reject invalid score data structure", () => {
      const currentPath: AppDataState = {
        email: "test@example.com",
        unlockedModules: [1],
      };

      const updates = {
        moduleScores: {
          "1": {
            score: "invalid", // Should be number
            maxScore: 100,
            percentage: 75,
            examId: "module-1-final",
            completedAt: new Date(),
          } as any,
        },
      };

      const result = LearningPathService.validateUpdate(currentPath, updates);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("must be numbers");
    });
  });

  describe("validateSequentialProgression", () => {
    it("should accept [1]", () => {
      const result = LearningPathService.validateSequentialProgression([1]);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should accept [1, 2, 3]", () => {
      const result = LearningPathService.validateSequentialProgression([
        1, 2, 3,
      ]);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should reject [1, 3] (gap)", () => {
      const result = LearningPathService.validateSequentialProgression([1, 3]);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("sequentially");
    });

    it("should reject [2, 3] (not starting with 1)", () => {
      const result = LearningPathService.validateSequentialProgression([2, 3]);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("start with module 1");
    });

    it("should reject [] (empty)", () => {
      const result = LearningPathService.validateSequentialProgression([]);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("cannot be empty");
    });

    it("should accept unsorted but sequential [3, 1, 2]", () => {
      const result = LearningPathService.validateSequentialProgression([
        3, 1, 2,
      ]);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("Helper Methods", () => {
    describe("isModuleCompleted", () => {
      it("should return true for completed module with passing score", () => {
        const currentPath: AppDataState = {
          email: "test@example.com",
          moduleScores: {
            "1": {
              score: 75,
              maxScore: 100,
              percentage: 75,
              examId: "module-1-final",
              completedAt: new Date(),
            },
          },
        };

        const result = LearningPathService.isModuleCompleted(currentPath, 1);

        expect(result).toBe(true);
      });

      it("should return false for module with failing score", () => {
        const currentPath: AppDataState = {
          email: "test@example.com",
          moduleScores: {
            "1": {
              score: 50,
              maxScore: 100,
              percentage: 50,
              examId: "module-1-final",
              completedAt: new Date(),
            },
          },
        };

        const result = LearningPathService.isModuleCompleted(currentPath, 1);

        expect(result).toBe(false);
      });

      it("should return false for non-existent module", () => {
        const currentPath: AppDataState = {
          email: "test@example.com",
          moduleScores: {},
        };

        const result = LearningPathService.isModuleCompleted(currentPath, 1);

        expect(result).toBe(false);
      });

      it("should return true for exactly 60% score", () => {
        const currentPath: AppDataState = {
          email: "test@example.com",
          moduleScores: {
            "1": {
              score: 60,
              maxScore: 100,
              percentage: 60,
              examId: "module-1-final",
              completedAt: new Date(),
            },
          },
        };

        const result = LearningPathService.isModuleCompleted(currentPath, 1);

        expect(result).toBe(true);
      });
    });

    describe("getHighestUnlockedModule", () => {
      it("should return highest module from unlocked array", () => {
        const currentPath: AppDataState = {
          email: "test@example.com",
          unlockedModules: [1, 2, 3],
        };

        const result =
          LearningPathService.getHighestUnlockedModule(currentPath);

        expect(result).toBe(3);
      });

      it("should return 1 for default state", () => {
        const currentPath: AppDataState = {
          email: "test@example.com",
          unlockedModules: [1],
        };

        const result =
          LearningPathService.getHighestUnlockedModule(currentPath);

        expect(result).toBe(1);
      });

      it("should handle unsorted array", () => {
        const currentPath: AppDataState = {
          email: "test@example.com",
          unlockedModules: [3, 1, 2],
        };

        const result =
          LearningPathService.getHighestUnlockedModule(currentPath);

        expect(result).toBe(3);
      });
    });

    describe("getNextUnlockableModule", () => {
      it("should return next module when current is completed", () => {
        const currentPath: AppDataState = {
          email: "test@example.com",
          unlockedModules: [1, 2],
          moduleScores: {
            "2": {
              score: 75,
              maxScore: 100,
              percentage: 75,
              examId: "module-2-final",
              completedAt: new Date(),
            },
          },
        };

        const result = LearningPathService.getNextUnlockableModule(currentPath);

        expect(result).toBe(3);
      });

      it("should return null when current module is not completed", () => {
        const currentPath: AppDataState = {
          email: "test@example.com",
          unlockedModules: [1, 2],
          moduleScores: {},
        };

        const result = LearningPathService.getNextUnlockableModule(currentPath);

        expect(result).toBeNull();
      });

      it("should return null when current module has failing score", () => {
        const currentPath: AppDataState = {
          email: "test@example.com",
          unlockedModules: [1],
          moduleScores: {
            "1": {
              score: 50,
              maxScore: 100,
              percentage: 50,
              examId: "module-1-final",
              completedAt: new Date(),
            },
          },
        };

        const result = LearningPathService.getNextUnlockableModule(currentPath);

        expect(result).toBeNull();
      });
    });
  });
});
