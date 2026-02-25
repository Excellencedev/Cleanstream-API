import type { Request, Response } from "express";
import {
  ValidateRequestSchema,
  FieldType,
  type ValidateResponse,
  type ValidationError,
} from "../models/schema.js";
import { inferSchema } from "../inference/index.js";

export async function validateHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const parseResult = ValidateRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: "Invalid request body",
        details: parseResult.error.issues,
      });
      return;
    }

    const { schema: providedSchema, data } = parseResult.data;
    const issues: ValidationError[] = [];

    // If no schema provided, infer it from data
    const schema = providedSchema ?? {
      fields: inferSchema(
        Object.keys(data[0] ?? {}),
        data.map((r) =>
          Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v)])),
        ),
      ),
    };

    // Validate each record against schema
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const record = data[rowIdx];

      for (const field of schema.fields) {
        const value = record[field.name];

        // Check for missing required fields
        if (value === undefined || value === null || value === "") {
          issues.push({
            row: rowIdx + 1,
            field: field.name,
            errorType: "missing_required",
            message: `Missing value for field "${field.name}"`,
            severity: "warning",
          });
          continue;
        }

        // Type validation
        const typeValid = validateType(value, field.type);
        if (!typeValid) {
          issues.push({
            row: rowIdx + 1,
            field: field.name,
            errorType: "type_mismatch",
            message: `Invalid ${field.type} value: "${value}"`,
            severity: "error",
          });
        }
      }
    }

    const response: ValidateResponse = {
      valid: issues.filter((i) => i.severity === "error").length === 0,
      issues,
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: "Validation failed", details: message });
  }
}

function validateType(value: unknown, type: FieldType): boolean {
  const strValue = String(value);

  switch (type) {
    case FieldType.Email:
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue);
    case FieldType.Number:
      return !isNaN(Number(strValue.replace(/[$€£¥,\s]/g, "")));
    case FieldType.Boolean:
      return ["true", "false", "yes", "no", "1", "0"].includes(
        strValue.toLowerCase(),
      );
    case FieldType.Date:
      return !isNaN(Date.parse(strValue));
    case FieldType.String:
      return true;
    default:
      return true;
  }
}
