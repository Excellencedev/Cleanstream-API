import { z } from "zod";

// Field types enum
export enum FieldType {
  String = "string",
  Number = "number",
  Boolean = "boolean",
  Date = "date",
  Email = "email",
  Phone = "phone",
  Name = "name",
}

// Field definition schema
export const FieldDefSchema = z.object({
  name: z.string(),
  type: z.nativeEnum(FieldType),
  confidence: z.number().min(0).max(1).optional(),
});

export type FieldDef = z.infer<typeof FieldDefSchema>;

// Schema definition
export const SchemaDefSchema = z.object({
  fields: z.array(FieldDefSchema),
});

export type SchemaDef = z.infer<typeof SchemaDefSchema>;

// Ingestion response
export interface IngestionResponse {
  jobId: string;
  schema: SchemaDef;
  records: Record<string, unknown>[];
  errors: ValidationError[];
  meta: {
    totalRecords: number;
    processedRecords: number;
    processingTimeMs: number;
  };
}

// Validation error
export interface ValidationError {
  row: number;
  field: string;
  errorType:
    | "type_mismatch"
    | "missing_required"
    | "invalid_format"
    | "duplicate";
  message: string;
  severity: "warning" | "error";
}

// Validate request
export const ValidateRequestSchema = z.object({
  schema: SchemaDefSchema.optional(),
  data: z.array(z.record(z.unknown())),
});

export type ValidateRequest = z.infer<typeof ValidateRequestSchema>;

// Validate response
export interface ValidateResponse {
  valid: boolean;
  issues: ValidationError[];
}

// Schema define request
export const SchemaDefineRequestSchema = z.object({
  name: z.string().optional(),
  targetSchema: SchemaDefSchema,
  mappings: z.record(z.string()).optional(),
});

export type SchemaDefineRequest = z.infer<typeof SchemaDefineRequestSchema>;

// Audit response
export interface AuditResponse {
  jobId: string;
  timestamp: string;
  recordsProcessed: number;
  errors: ValidationError[];
  schema: SchemaDef;
  processingTimeMs: number;
}
