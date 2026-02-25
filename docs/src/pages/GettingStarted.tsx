

export function GettingStarted() {
    return (
        <div className="prose max-w-none">
            <h1>Getting Started</h1>

            <h2>Installation</h2>
            <p>
                You can run CleanStream API locally using Docker or directly with Bun/Node.js.
            </p>

            <h3>Using Docker (Recommended)</h3>
            <pre>
                <code>
                    {`# Build the image
docker build -t cleanstream-api .

# Run the container
docker run -p 3000:3000 -e API_KEY=your-secret-key cleanstream-api`}
                </code>
            </pre>

            <h3>Using Bun</h3>
            <pre>
                <code>
                    {`# Install dependencies
bun install

# Start development server
bun run dev`}
                </code>
            </pre>

            <h2>Configuration</h2>
            <p>
                Create a <code>.env</code> file in the root directory:
            </p>
            <pre>
                <code>
                    {`PORT=3000
API_KEY=test-api-key
RATE_LIMIT_MAX=100
MAX_FILE_SIZE_MB=50`}
                </code>
            </pre>
        </div>
    );
}
