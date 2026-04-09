import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

const usageStore = new Map<string, number>();

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // IP Whitelisting
  if (config.ipWhitelist.length > 0) {
    const clientIp = req.ip || req.socket.remoteAddress || "";
    if (!config.ipWhitelist.includes(clientIp)) {
      res.status(403).json({ error: "IP not whitelisted" });
      return;
    }
  }

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

  // Per-key usage quota
  const currentUsage = usageStore.get(token) || 0;
  if (currentUsage >= config.perKeyQuota) {
    res.status(429).json({ error: "Monthly quota exceeded for this API key" });
    return;
  }

  // Increment usage (simplified for now, ideally persistent)
  usageStore.set(token, currentUsage + 1);

  next();
}
