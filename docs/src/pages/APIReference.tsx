

export function APIReference() {
    return (
        <div className="prose max-w-none">
            <h1>API Reference</h1>

            <div className="bg-slate-50 border-l-4 border-blue-500 p-4 mb-6">
                <p className="text-sm">
                    <strong>Base URL:</strong> <code>http://localhost:3000</code><br />
                    All endpoints require <code>Authorization: Bearer &lt;API_KEY&gt;</code> header.
                </p>
            </div>

            <h2>Endpoints</h2>

            <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-bold font-mono">POST</span>
                    <code className="text-lg">/ingest</code>
                </div>
                <p>Ingest and normalize data from file uploads or JSON body.</p>

                <h3>Request</h3>
                <pre><code>curl -X POST /ingest \
                    -H "Authorization: Bearer key" \
                    -F "file=@data.csv"</code></pre>

                <h3>Response</h3>
                <pre><code>{`{
  "jobId": "uuid",
  "records": [...],
  "schema": {...},
  "meta": {...}
}`}</code></pre>
            </div>

            <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-bold font-mono">POST</span>
                    <code className="text-lg">/validate</code>
                </div>
                <p>Validate data against a predefined schema.</p>
                <pre><code>{`{
  "schema": { "fields": [...] },
  "data": [...]
}`}</code></pre>
            </div>

            <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-bold font-mono">GET</span>
                    <code className="text-lg">/audit/:jobId</code>
                </div>
                <p>Retrieve detailed audit logs and processing stats for a specific job.</p>
            </div>
        </div>
    );
}
