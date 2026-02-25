import type { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { SchemaDefineRequestSchema, type SchemaDef } from "../models/schema.js";

// In-memory schema store (would be a database in production)
export const schemaStore = new Map<
  string,
  {
    id: string;
    name: string;
    schema: SchemaDef;
    mappings?: Record<string, string>;
  }
>();

export async function schemaDefineHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const parseResult = SchemaDefineRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: "Invalid request body",
        details: parseResult.error.issues,
      });
      return;
    }

    const { name, targetSchema, mappings } = parseResult.data;
    const schemaId = uuidv4();

    schemaStore.set(schemaId, {
      id: schemaId,
      name: name ?? `schema_${schemaId.slice(0, 8)}`,
      schema: targetSchema,
      mappings,
    });

    res.status(201).json({
      id: schemaId,
      message: "Schema created successfully",
      schema: targetSchema,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res
      .status(500)
      .json({ error: "Failed to create schema", details: message });
  }
}
