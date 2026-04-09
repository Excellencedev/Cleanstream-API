# CleanStream API

Data Ingestion & Normalization API - Transform messy CSV, Excel, XML, and JSON into clean, validated, production-ready data.

[![CI](https://github.com/cleanstream/cleanstream-api/actions/workflows/ci.yml/badge.svg)](https://github.com/cleanstream/cleanstream-api/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Overview

CleanStream API is an enterprise-grade solution for handling messy data imports. Whether you're building a SaaS product that accepts customer spreadsheets or a data pipeline that needs to normalize inconsistent partner feeds, CleanStream automates the tedious work of parsing, cleaning, and validating data.

### Key Features

-   **Multi-format Support:** Ingest CSV, XLSX, XML, and JSON.
-   **Auto Schema Inference:** Automatically detect types (email, date, number, boolean) with confidence scores.
-   **Smart Normalization:** Standardize dates to ISO 8601, normalize currencies and numbers, and clean strings.
-   **Validation:** Validate data against inferred or custom-defined schemas.
-   **Idempotency:** Safe retries for ingestion jobs using `Idempotency-Key`.
-   **Audit Trail:** Detailed processing logs for every job.

## 🚀 Quick Start

### Prerequisites

-   [Bun](https://bun.sh) runtime installed.

### Installation

```bash
bun install
```

### Running the Server

```bash
# Development
bun run dev

# Production
bun run start
```

## 🛠 API Reference

### Authentication

All endpoints (except `/health` and `/ready`) require a Bearer token:

```
Authorization: Bearer <your-api-key>
```

Set your API keys via the `API_KEYS` environment variable (comma-separated).

### Endpoints

#### `POST /ingest`

Ingest and normalize data. Supports `multipart/form-data` for files and `application/json` for raw data.

**Example Request (Curl):**

```bash
curl -X POST http://localhost:3000/ingest \
  -H "Authorization: Bearer test-api-key" \
  -F "file=@data.csv"
```

#### `POST /validate`

Validate data against a schema.

#### `POST /schema/define`

Create reusable target schemas for consistent normalization.

#### `GET /audit/:jobId`

Retrieve the audit log for a specific ingestion job.

## 🧪 Testing

CleanStream comes with a comprehensive test suite covering unit, integration, and E2E tests.

```bash
# Run unit and integration tests
bun run test

# Run E2E tests
bun run test:e2e

# Run all checks (lint + typecheck + tests)
bun run ci
```

## 📦 Docker Support

```bash
docker compose up -d
```

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
