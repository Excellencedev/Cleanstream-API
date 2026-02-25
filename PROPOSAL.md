CleanStream API

Goal:
Build a production-ready, API-first Data Ingestion & Normalization service that ingests messy structured or semi-structured data (CSV, Excel, JSON, XML, API responses) and returns validated, normalized JSON outputs ready for use in databases or pipelines. This is a painkiller system used by SaaS products, analytics tools, marketplaces, and integration platforms to replace fragile in-house parsers.

📌 1. System Overview (What It Is)

CleanStream API is an HTTP API that:

Accepts file uploads (CSV, XLSX, XML) and JSON payloads.

Infers schemas and normalizes inconsistent inputs.

Validates data (types, formats, missing values).

Maps fields to a predictable output schema.

Outputs clean, structured JSON ready for storage/processing.

Provides detailed diagnostics for validation errors.

This service must be:

Stateless by design

Scalable HTTP API

Cloud-agnostic

Robust to malformed input

🗂 2. Core Functional Requirements
✅ 2.1 Data Ingestion

Incoming payloads must be accepted via:

POST /ingest


Supports:

File upload: multipart/form-data for CSV/XLSX/XML

JSON body input for API dumps/webhooks

✅ 2.2 Schema Inference

Automatically derive field names and types:

Detect string, number, date/time, boolean

Normalize headers (trim, lowercase, snake_case)

Infer relationships (e.g., “user email” → “email”)

✅ 2.3 Data Cleaning & Normalization

For each input:

Strip invalid characters

Standardize dates (ISO 8601)

Trim whitespace

Normalize numeric formats

Resolve duplicates

Ensure consistent output keys across records

Example Output Structure

{
  "schema": {
    "fields": [
      {"name": "customer_id", "type": "string"},
      {"name": "email", "type": "email"},
      {"name": "total_amount", "type": "number"}
    ]
  },
  "records": [
    {"customer_id": "123", "email": "a@b.com", "total_amount": 67.50}
  ],
  "errors": []
}

✅ 2.4 Error Reporting

If rows don’t match the inferred schema:

Return a diagnostic error list

Include row number, field name, and error type

API returns:

Normalized records

Error list (warnings vs failures)

✅ 2.5 Validation Endpoint
POST /validate


Input:

JSON schema definition (optional)

Sample data
Response:

Whether data matches schema

Error details

✅ 2.6 Schema Definition Endpoint
POST /schema/define


Allows user to define a stable target schema (CSV column → normalized field mapping).

✅ 2.7 Job Status / Audit
GET /audit/{job_id}


Returns:

Ingestion time

Records processed

Errors/warnings

Schema used

🚧 3. API Contracts (OpenAPI-style)
POST /ingest

Request

File upload or JSON body

Headers: Content-Type, Accept: application/json
Response

200 Success with JSON output (normalized records)

400 if payload issues

422 for validation issues with detailed errors

POST /validate

Request

Body: { "schema": { ... }, "data": [ ... ] }
Response

{ "valid": true | false, "issues": [...] }

POST /schema/define

Request

Body: { "target_schema": { ... } }
Response

Acknowledgment + ID

GET /audit/{job_id}

Response

{ "job_id": "...", "records": n, "errors": [...], "schema": {...} }

🧱 4. Technical Architecture
🧠 Backend

Language: Rust or Python (fast parser + memory safety)

Processing: streaming parsers for CSV/XLSX/XML

Schema inference: rule-based + ML optional

Validation: strict type checking

Storage: stateless API (no DB required for completion; optional audit DB)

📌 File Handling

Use multipart upload

Limit size (10–50MB)

Stream parsing (low memory footprint)

📈 Scalability

Horizontal scaling

Stateless workers

Load balancer

Auto-scale based on CPU/memory

🔒 Security

API keys (bearer)

Rate limiting

Input sanitization

Auth per customer

📊 5. Non-Functional Requirements
📍 Performance

95% of jobs complete < 2s for up to 10k rows

90th percentile < 500ms for smaller files (≤ 3k rows)

📍 Reliability

Errors are surfaced meaningfully (not stack traces)

Fallbacks for tricky formats

📍 Monitoring

Metrics: success/failure, response times, API usage

Logs: ingestion success / error patterns

📈 6. Data Normalization & Rules

You should implement rules for common patterns:

Email normalization

Standard date formats

Numeric casting (strip symbols, convert different locale formats)

Null handling

Duplicate detection

Include per-field confidence scores.

🧪 7. Testing Requirements

For each endpoint:

Unit tests for schema inference

Integration tests with real messy CSV/Excel samples

Edge cases:

Missing headers

Mixed types in a column

Incorrect encoding

🎯 8. Success Criteria (When Is This Done)

This project is complete when:

All API endpoints are implemented

Each endpoint has docs + examples

Automated tests cover:

Schema inference

Normalization

Error handling

Performance:

Fast responses documented

Live demo (CLI or sample app)

OpenAPI spec created (see managing APIs doc for publishing on RapidAPI)

🧾 9. Documentation Plan

Produce:

OpenAPI (Swagger)

README with examples (curl, Python, JS)

Schema mapping and error reference

Tutorial for developers

RapidAPI listing requires swagger upload and rich docs (spotlights/tutorials) .

📌 10. Deployment & Launch
Deploy

Containerize (Docker)

Kubernetes / serverless

CI/CD

Launch Channels

RapidAPI Marketplace

GitHub repo + demo

Dev blogs (“Stop writing your own CSV parsers”)

📎 Practical Example (Pseudo-CLI Test)
curl -X POST https://cleanstream.example.com/ingest \
  -H "Authorization: Bearer $API_KEY" \
  -F "file=@orders.csv" \
  -H "Accept: application/json"


Expected Response

{
  "schema": { ... },
  "records": [ {...}, {...} ],
  "errors": []
}