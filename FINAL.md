# 🚀 CleanStream API Publishing & Pricing Guide (RapidAPI)

This document outlines the strategy for publishing CleanStream API to RapidAPI, including pricing tiers and marketing tips to ensure success.

## 1. Preparation for RapidAPI

### OpenAPI Specification
Ensure `openapi.json` is up-to-date. RapidAPI uses this to generate the interactive documentation.

### Base URL
When publishing, you will point RapidAPI to your hosted instance (e.g., `https://api.cleanstream.io`). RapidAPI acts as a proxy, handling authentication and billing.

### Security
In your actual server, you should only allow requests from RapidAPI IPs or use a secret header that RapidAPI sends to your backend to verify the request originated from their proxy.

## 2. Pricing Strategy

We recommend a **Freemium** model to encourage adoption while capturing value from high-volume users.

### ⚠️ Prerequisite: Server-Side Entitlement Enforcement
**Important:** The pricing tiers documented below are unenforceable without server-side logic or a trusted gateway. You must ensure your request handling stack uses a plan-aware quota check.

**Implementation Steps:**
1.  **Quota Middleware:** Implement or update `getPlanForUser` and `planAwareRateLimiter` middleware that maps a user/tenant to Tiers 1–4.
2.  **Request Caps:** Enforce per-plan monthly request caps and concurrent processing limits.
3.  **Retention Metadata:** Persist audit entries with retention metadata (e.g., `auditRetentionPolicy` enforcement) to automatically purge logs based on the user's tier.
4.  **Token Validation:** Validate gateway-provided plan mappings with signed tokens or a server-side lookup. Without these checks, the tiers are merely cosmetic.

### Pricing Tiers

#### Tier 1: BASIC (Free)
- **Price:** $0/month
- **Requests:** 500 / month
- **Features:** Core ingestion, normalization, and validation.
- **Goal:** Allow developers to test and integrate without friction.

#### Tier 2: PRO
- **Price:** $29 / month
- **Requests:** 10,000 / month
- **Features:** Increased rate limits, priority support, and 30-day audit retention.
- **Goal:** Suitable for small startups and small-scale automation.

#### Tier 3: ULTRA
- **Price:** $99 / month
- **Requests:** 50,000 / month
- **Features:** Higher limits, 90-day audit retention, custom schema definitions.
- **Goal:** Growing businesses with significant data ingestion needs.

#### Tier 4: MEGA
- **Price:** $249 / month
- **Requests:** 200,000 / month
- **Features:** Highest performance, 1-year audit retention, dedicated support.
- **Goal:** High-volume enterprise-grade usage.

## 3. How to Deploy and Publish to RapidAPI

Follow these exact steps to get your API live:

### Step 1: Deploy your Backend
1.  Containerize the application using the provided `Dockerfile`.
2.  Deploy to a cloud provider (AWS, GCP, DigitalOcean, etc.).
3.  Ensure your environment variables (`API_KEYS`, `IDEMPOTENCY_TTL_MS`, etc.) are correctly set.
4.  Verify the `/health` endpoint is publicly accessible.

### Step 2: Create a Provider Account
1.  Sign up on the [RapidAPI Provider Dashboard](https://rapidapi.com/hub).

### Step 3: Add New API
1.  Click **"Add New API"**.
2.  **Details:**
    - **Name:** CleanStream - Data Ingestion & Normalization
    - **Description:** Transform messy CSV, Excel, XML, and JSON into clean, validated JSON.
    - **Category:** Data, Tools.
3.  **Definition:** Upload your `openapi.json` file. This automatically populates your endpoints.

### Step 4: Configure Gateway & Security
1.  In the **"Gateway"** tab, enter your **Base URL** (the URL of your deployed backend).
2.  Set up **Transformation**: Add a header transformation to pass your internal API Key to your backend, or use RapidAPI's proxy headers to verify requests.

### Step 5: Set Pricing Plans
1.  Go to the **"Plans & Pricing"** tab.
2.  Create the four tiers (Basic, Pro, Ultra, Mega) as defined in Section 2.
3.  Configure the monthly request limits for each tier.

### Step 6: Test and Publish
1.  Use the **"Endpoints"** tab to test each route through the RapidAPI proxy.
2.  Once verified, click **"Make API Public"**.

## 4. Success Tips

-   **High-Quality Examples:** Ensure your endpoints have clear examples for various languages (JS, Python, Ruby) which RapidAPI generates.
-   **Engage with Users:** Respond quickly to discussions and support tickets on the RapidAPI platform.
-   **Performance:** Keep latency low. Users on RapidAPI value speed and reliability.
-   **Keywords:** Use relevant keywords in your description: `CSV to JSON`, `Data Cleaning`, `Excel Parser`, `Schema Inference`.

## 5. Product Assessment & Success Strategy

### Is CleanStream API useful?
**Yes.** The "messy data import" problem is a universal pain point for B2B SaaS companies. Developers hate writing and maintaining custom parsers for every customer's unique spreadsheet format. A reliable, multi-format normalization API is a high-value "painkiller."

### Will it succeed?
The API is currently a strong technical core. To achieve significant commercial success and stand out on marketplaces like RapidAPI, we recommend the following roadmap:

#### Short-Term (The "Moat" Builders)
- **Advanced Normalizers:** Add specialized handling for addresses, phone numbers (E.164), and person names.
- **Asynchronous Processing:** Support for 100MB+ files by processing them in the background and notifying via webhooks.
- **Enhanced Security:** Implement per-key usage quotas and IP whitelisting.

#### Mid-Term (Enterprise Readiness)
- **Database Persistence:** Move audit logs from a JSON file to a robust database like SQLite or PostgreSQL for better scalability and query performance.
- **Team Management:** Allow users to manage multiple API keys and view usage analytics via the docs dashboard.
- **Pre-built Templates:** Offer one-click normalization for common exports (e.g., "Normalize Shopify Customer Export").

#### Long-Term (Distribution)
- **SDKs:** Release official libraries for Python, Node.js, and Go to make integration a 1-minute task.
- **No-Code Integrations:** Create Zapier or Make.com connectors so non-technical users can also use CleanStream.

---

*This guide and assessment were prepared to help CleanStream API reach its full potential as a commercial product.*
