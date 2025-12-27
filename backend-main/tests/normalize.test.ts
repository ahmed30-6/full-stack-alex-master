/**
 * Unit tests for normalization utilities
 * Ensures MongoDB CastError prevention works correctly
 */

import {
  normalizeCognitiveLevel,
  normalizeGroup,
  normalizeGroups,
} from "../utils/normalize";

describe("normalizeCognitiveLevel", () => {
  test("converts Arabic 'أساسي' to 1", () => {
    expect(normalizeCognitiveLevel("أساسي")).toBe(1);
  });

  test("converts Arabic 'متوسط' to 2", () => {
    expect(normalizeCognitiveLevel("متوسط")).toBe(2);
  });

  test("converts Arabic 'متقدم' to 3", () => {
    expect(normalizeCognitiveLevel("متقدم")).toBe(3);
  });

  test("passes through number 1", () => {
    expect(normalizeCognitiveLevel(1)).toBe(1);
  });

  test("passes through number 2", () => {
    expect(normalizeCognitiveLevel(2)).toBe(2);
  });

  test("passes through number 3", () => {
    expect(normalizeCognitiveLevel(3)).toBe(3);
  });

  test("returns undefined for null", () => {
    expect(normalizeCognitiveLevel(null)).toBeUndefined();
  });

  test("returns undefined for undefined", () => {
    expect(normalizeCognitiveLevel(undefined)).toBeUndefined();
  });

  test("returns undefined for invalid string", () => {
    expect(normalizeCognitiveLevel("invalid")).toBeUndefined();
  });

  test("converts English 'basic' to 1", () => {
    expect(normalizeCognitiveLevel("basic")).toBe(1);
  });

  test("converts English 'intermediate' to 2", () => {
    expect(normalizeCognitiveLevel("intermediate")).toBe(2);
  });

  test("converts English 'advanced' to 3", () => {
    expect(normalizeCognitiveLevel("advanced")).toBe(3);
  });

  test("parses numeric string '2'", () => {
    expect(normalizeCognitiveLevel("2")).toBe(2);
  });

  test("handles whitespace in strings", () => {
    expect(normalizeCognitiveLevel(" أساسي ")).toBe(1);
  });
});

describe("normalizeGroup", () => {
  test("normalizes group with Arabic level", () => {
    const input = {
      id: "group-1",
      name: "Test Group",
      level: "أساسي",
      members: ["user1"],
    };

    const result = normalizeGroup(input);

    expect(result.level).toBe(1);
    expect(result.id).toBe("group-1");
    expect(result.name).toBe("Test Group");
    expect(result.members).toEqual(["user1"]);
  });

  test("preserves numeric level", () => {
    const input = {
      id: "group-2",
      name: "Test Group 2",
      level: 2,
      members: ["user2"],
    };

    const result = normalizeGroup(input);

    expect(result.level).toBe(2);
  });

  test("handles missing level", () => {
    const input = {
      id: "group-3",
      name: "Test Group 3",
      members: ["user3"],
    };

    const result = normalizeGroup(input);

    expect(result.level).toBeUndefined();
  });

  test("handles null input", () => {
    const result = normalizeGroup(null);
    expect(result).toBeNull();
  });
});

describe("normalizeGroups", () => {
  test("normalizes array of groups", () => {
    const input = [
      { id: "g1", name: "Group 1", level: "أساسي" },
      { id: "g2", name: "Group 2", level: 2 },
      { id: "g3", name: "Group 3", level: "متقدم" },
    ];

    const result = normalizeGroups(input);

    expect(result[0].level).toBe(1);
    expect(result[1].level).toBe(2);
    expect(result[2].level).toBe(3);
  });

  test("handles empty array", () => {
    const result = normalizeGroups([]);
    expect(result).toEqual([]);
  });

  test("handles non-array input", () => {
    const result = normalizeGroups(null as any);
    expect(result).toEqual([]);
  });
});
