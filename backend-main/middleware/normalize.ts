import { Request, Response, NextFunction } from "express";

/**
 * Username normalization function
 * Applies consistent normalization rules: trim whitespace and convert to lowercase
 */
export const normalizeUsername = (username: string): string => {
  if (!username || typeof username !== "string") {
    return username;
  }
  return username.trim().toLowerCase();
};

/**
 * Middleware to normalize username in request body
 * Applies to any endpoint that accepts a username field
 */
export const normalizeUsernameMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.body && req.body.username) {
    req.body.username = normalizeUsername(req.body.username);
  }
  next();
};

/**
 * Middleware to normalize name field (for display names)
 * Trims whitespace but preserves case for proper names
 */
export const normalizeNameMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.body && req.body.name && typeof req.body.name === "string") {
    req.body.name = req.body.name.trim();
  }
  next();
};

/**
 * Middleware to normalize email
 * Trims whitespace and converts to lowercase
 */
export const normalizeEmailMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.body && req.body.email && typeof req.body.email === "string") {
    req.body.email = req.body.email.trim().toLowerCase();
  }
  next();
};

/**
 * Combined normalization middleware
 * Normalizes username, email, and name fields if present
 */
export const normalizeUserInput = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.body) {
    // Normalize username
    if (req.body.username && typeof req.body.username === "string") {
      req.body.username = normalizeUsername(req.body.username);
    }

    // Normalize email
    if (req.body.email && typeof req.body.email === "string") {
      req.body.email = req.body.email.trim().toLowerCase();
    }

    // Normalize name (trim only, preserve case)
    if (req.body.name && typeof req.body.name === "string") {
      req.body.name = req.body.name.trim();
    }
  }
  next();
};
