import Joi from "joi";

/**
 * Common validation patterns
 */
const patterns = {
  email: Joi.string().email().required(),
  firebaseUid: Joi.string().min(1).max(128).required(),
  username: Joi.string().min(3).max(30).required(),
  name: Joi.string().min(1).max(100).required(),
  url: Joi.string().uri().max(500),
  role: Joi.string().valid("admin", "student", "teacher"),
  status: Joi.string().valid("active", "inactive", "suspended"),
};

/**
 * POST /api/sync/user validation
 */
export const syncUserSchema = Joi.object({
  firebaseUid: patterns.firebaseUid,
  username: patterns.username,
  email: patterns.email,
  profile: Joi.object().optional(),
  role: patterns.role.optional(),
});

/**
 * POST /api/sync/login-time validation
 */
export const syncLoginTimeSchema = Joi.object({
  firebaseUid: patterns.firebaseUid,
});

/**
 * POST /api/scores validation
 */
export const scoresSchema = Joi.object({
  studentUid: Joi.string().required(),
  examId: Joi.string().required(),
  score: Joi.number().min(0).required(),
  maxScore: Joi.number().min(0).required(),
  groupId: Joi.string().optional(),
  meta: Joi.object().optional(),
}).custom((value, helpers) => {
  // Validate that score doesn't exceed maxScore
  if (value.score > value.maxScore) {
    return helpers.error("any.invalid", {
      message: "score cannot exceed maxScore",
    });
  }
  return value;
});

/**
 * GET /api/scores query validation
 */
export const scoresQuerySchema = Joi.object({
  studentUid: Joi.string().optional(),
  examId: Joi.string().optional(),
  groupId: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  skip: Joi.number().integer().min(0).default(0),
});

/**
 * POST /api/activity/file validation
 */
export const activityFileSchema = Joi.object({
  activityId: Joi.string().required(),
  groupId: Joi.string().required(),
  filename: Joi.string().min(1).max(255).required(),
  url: patterns.url.required(),
  uploadedByUid: Joi.string().required(),
});

/**
 * GET /api/activity/file query validation
 */
export const activityFileQuerySchema = Joi.object({
  activityId: Joi.string().optional(),
  groupId: Joi.string().optional(),
  uploadedByUid: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  skip: Joi.number().integer().min(0).default(0),
});

/**
 * POST /api/activity/message validation
 */
export const activityMessageSchema = Joi.object({
  activityId: Joi.string().required(),
  groupId: Joi.string().required(),
  text: Joi.string().min(1).max(5000).required(),
});

/**
 * GET /api/activity/message query validation
 */
export const activityMessageQuerySchema = Joi.object({
  activityId: Joi.string().optional(),
  groupId: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  skip: Joi.number().integer().min(0).default(0),
});

/**
 * POST /api/appdata validation
 */
export const appDataSchema = Joi.object({
  moduleScores: Joi.object().optional(),
  completedLessons: Joi.object().optional(),
  finalQuizPassed: Joi.boolean().optional(),
  unlockedModules: Joi.array().items(Joi.number()).optional(),
  currentActivityId: Joi.number().allow(null).optional(),
  currentModuleId: Joi.number().allow(null).optional(),
  moduleLessonIndex: Joi.number().min(0).optional(),
  modulePageIndex: Joi.number().min(0).optional(),
  learningPathTopic: Joi.string().allow(null).optional(),
  groups: Joi.array().optional(),
  discussions: Joi.array().optional(),
  newsItems: Joi.array().optional(),
});

/**
 * POST /api/users validation
 */
export const createUserSchema = Joi.object({
  name: patterns.name,
  email: patterns.email.optional(),
  avatar: patterns.url.optional().allow(null, ""),
  updateName: Joi.boolean().optional(),
});

/**
 * GET /api/users query validation
 */
export const getUsersQuerySchema = Joi.object({
  role: patterns.role.optional(),
  status: patterns.status.optional(),
  limit: Joi.number().integer().min(1).max(1000).default(1000),
  skip: Joi.number().integer().min(0).default(0),
});

/**
 * POST /api/profile validation
 */
export const profileSchema = Joi.object({
  email: patterns.email.optional(),
  firebaseUid: Joi.string().optional(),
}).or("email", "firebaseUid"); // At least one must be provided

/**
 * POST /api/loginEvent validation
 */
export const loginEventSchema = Joi.object({
  name: Joi.string().optional(),
  email: patterns.email.optional(),
  userAgent: Joi.string().max(500).optional(),
});

/**
 * POST /api/groups validation
 * TASK 1: name is optional - backend generates it server-side
 */
export const createGroupSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  type: Joi.string().valid("single", "multi").default("single"),
  level: Joi.string().valid("beginner", "intermediate", "advanced").default("beginner"),
  members: Joi.array().items(Joi.string()).default([]),
  description: Joi.string().max(500).optional(),
});

/**
 * GET /api/groups query validation
 */
export const getGroupsQuerySchema = Joi.object({
  level: Joi.string().valid("beginner", "intermediate", "advanced").optional(),
  type: Joi.string().valid("single", "multi").optional(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  skip: Joi.number().integer().min(0).default(0),
});

/**
 * GET /api/appdata/:uid params validation
 */
export const appDataParamsSchema = Joi.object({
  uid: Joi.string().required(),
});

/**
 * GET /api/login-times/:uid params validation
 */
export const loginTimesParamsSchema = Joi.object({
  uid: Joi.string().required(),
});

/**
 * POST /api/submissions validation
 */
export const submissionSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  type: Joi.string().min(1).max(100).required(),
  data: Joi.string().required(), // base64 encoded file
  moduleId: Joi.number().integer().optional(),
  activityId: Joi.number().integer().optional(),
});
