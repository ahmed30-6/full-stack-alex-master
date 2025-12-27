/**
 * Utility functions for normalizing data before MongoDB writes
 * Prevents CastError and other type-related runtime errors
 */

/**
 * Normalize cognitive level from Arabic string or number to number
 * Prevents MongoDB CastError when level field receives Arabic strings
 *
 * @param level - Can be number (1, 2, 3), Arabic string ("أساسي", "متوسط", "متقدم"), or undefined/null
 * @returns Normalized number (1, 2, 3) or undefined
 *
 * @example
 * normalizeCognitiveLevel("أساسي") // returns 1
 * normalizeCognitiveLevel(2) // returns 2
 * normalizeCognitiveLevel(null) // returns undefined
 */
export function normalizeCognitiveLevel(
  level: number | string | null | undefined
): number | undefined {
  // Handle null/undefined
  if (level === undefined || level === null) {
    return undefined;
  }

  // Already a number - return as-is
  if (typeof level === "number") {
    return level;
  }

  // String - map Arabic to number
  if (typeof level === "string") {
    const levelMap: { [key: string]: number } = {
      أساسي: 1,
      متوسط: 2,
      متقدم: 3,
      // English fallbacks (just in case)
      basic: 1,
      intermediate: 2,
      advanced: 3,
    };

    const normalized = levelMap[level.trim()];
    if (normalized !== undefined) {
      return normalized;
    }

    // Try parsing as number string
    const parsed = parseInt(level, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 3) {
      return parsed;
    }

    // Invalid string - return undefined
    console.warn(`⚠️  Invalid cognitive level string: "${level}"`);
    return undefined;
  }

  // Unknown type - return undefined
  console.warn(`⚠️  Invalid cognitive level type: ${typeof level}`);
  return undefined;
}

/**
 * Normalize a group object before saving to MongoDB
 * Ensures level field is properly converted to number
 *
 * @param group - Group object that may contain Arabic level strings
 * @returns Normalized group object safe for MongoDB
 */
export function normalizeGroup(group: any): any {
  if (!group || typeof group !== "object") {
    return group;
  }

  return {
    ...group,
    level: normalizeCognitiveLevel(group.level),
  };
}

/**
 * Normalize an array of groups before saving to MongoDB
 *
 * @param groups - Array of group objects
 * @returns Array of normalized group objects
 */
export function normalizeGroups(groups: any[]): any[] {
  if (!Array.isArray(groups)) {
    return [];
  }

  return groups.map(normalizeGroup);
}
