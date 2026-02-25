import type { Request, Response } from "express";
import type { AuditResponse } from "../models/schema.js";

// In-memory audit store (would be a database in production)
export const auditStore = new Map<string, AuditResponse>();

export async function auditHandler(req: Request, res: Response): Promise<void> {
  const { jobId } = req.params;

  if (!jobId) {
    res.status(400).json({ error: "Job ID is required" });
    return;
  }

  const audit = auditStore.get(jobId);

  if (!audit) {
    res.status(404).json({ error: `Job not found: ${jobId}` });
    return;
  }

  res.json(audit);
}
