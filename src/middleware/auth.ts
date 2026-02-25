import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: "Missing Authorization header" });
    return;
  }

  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    res
      .status(401)
      .json({ error: "Invalid Authorization format. Use: Bearer <token>" });
    return;
  }

  if (!config.apiKeys.has(token)) {
    res.status(403).json({ error: "Invalid API key" });
    return;
  }

  next();
}
