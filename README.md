# CleanStream API

Data Ingestion & Normalization API - Transform messy CSV, Excel, XML, and JSON into clean, validated data.

## Quick Start

```bash
# Install dependencies
bun install

# Start development server (with hot reload)
bun run dev

# Run unit + integration tests (no running server required)
bun run test

# Run E2E tests (spins up an isolated local server automatically)
bun run test:e2e

# Type check
bun run typecheck
```

## Docker

```bash
# Build and run
docker compose up -d

# Or build manually
docker build -t cleanstream-api .
docker run -p 3000:3000 cleanstream-api
```

## API Endpoints

All endpoints (except `/health`) require authentication:

```
Authorization: Bearer <your-api-key>
```

### POST /ingest

Ingest and normalize data from file uploads or JSON body.

**File upload:**

```bash
curl -X POST http://localhost:3000/ingest \
  -H "Authorization: Bearer test-api-key" \
  -F "file=@data.csv"
```

**JSON body:**

```bash
curl -X POST http://localhost:3000/ingest \
  -H "Authorization: Bearer test-api-key" \
  -H "Content-Type: application/json" \
  -d '{"data": [{"name": "John", "email": "john@example.com"}]}'
```

**Supported formats:** CSV, XLSX, XML, JSON

**Idempotency support:** send `Idempotency-Key` on `POST /ingest` to safely retry without duplicate processing. Reusing the same key with a different payload returns `409`.

**Response:**

```json
{
  "jobId": "uuid",
  "schema": {
    "fields": [
      { "name": "name", "type": "string", "confidence": 1 },
      { "name": "email", "type": "email", "confidence": 1 }
    ]
  },
  "records": [{ "name": "John", "email": "john@example.com" }],
  "errors": [],
  "meta": { "totalRecords": 1, "processedRecords": 1, "processingTimeMs": 10 }
}
```

### POST /validate

Validate data against a schema.

```bash
curl -X POST http://localhost:3000/validate \
  -H "Authorization: Bearer test-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "schema": {"fields": [{"name": "email", "type": "email"}]},
    "data": [{"email": "test@example.com"}]
  }'
```

### POST /schema/define

Define a reusable target schema.

```bash
curl -X POST http://localhost:3000/schema/define \
  -H "Authorization: Bearer test-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "customer_schema",
    "targetSchema": {
      "fields": [
        {"name": "customer_id", "type": "string"},
        {"name": "email", "type": "email"}
      ]
    }
  }'
```

### GET /audit/:jobId

Get audit details for a processed job.

```bash
curl http://localhost:3000/audit/<job-id> \
  -H "Authorization: Bearer test-api-key"
```

## Features

### Auto Schema Inference

- Detects field types automatically (string, number, boolean, date, email)
- Confidence scores per field
- Header normalization to snake_case

### Field Relationship Mapping

Maps common field aliases:

- `user_email`, `contact_email` → `email`
- `phone_number`, `telephone`, `mobile` → `phone`
- `first_name`, `fname`, `given_name` → `first_name`

### Data Normalization

- **Dates**: Converts various formats to ISO 8601
- **Numbers**: Handles currencies ($, €, £), locale formats (1,234.56 / 1.234,56), percentages
- **Strings**: Trims whitespace, removes control characters
- **Emails**: Lowercase, validation

### Duplicate Detection

Identifies duplicate records with configurable key fields.

### Error Reporting

Detailed validation errors with row number, field name, and severity.

## Configuration

| Variable             | Default                  | Description                                 |
| -------------------- | ------------------------ | ------------------------------------------- |
| `PORT`               | 3000                     | Server port                                 |
| `API_KEY`            | test-api-key             | Valid API key                               |
| `RATE_LIMIT_MAX`     | 100                      | Max requests per rate-limit window          |
| `AUDIT_STORE_FILE`   | `.data/audit-store.json` | Path for persisted audit history            |
| `IDEMPOTENCY_TTL_MS` | 86400000                 | TTL (ms) for `Idempotency-Key` replay cache |

## API Documentation

OpenAPI 3.0 spec available at [openapi.json](./openapi.json)

## Testing

```bash
# Run unit + integration tests
bun run test

# Includes middleware/handler integration suites and parser/normalizer/inference tests

# Run E2E tests (isolated local server)
bun run test:e2e

# Run all checks (lint + typecheck + unit/integration tests)
bun run ci

# Run everything including E2E
bun run test:all

# Type check
bun run typecheck
```
