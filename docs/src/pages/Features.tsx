

export function Features() {
    return (
        <div className="prose max-w-none">
            <h1>Features</h1>

            <h2>Data Normalization</h2>
            <p>CleanStream automatically normalizes messy data into standard formats.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                <div className="border rounded p-4">
                    <h3 className="mt-0">Dates</h3>
                    <p className="text-sm text-slate-600 mb-2">Converts various formats to ISO 8601 (YYYY-MM-DD).</p>
                    <ul className="text-sm">
                        <li><code>01/15/2024</code> → <code>2024-01-15</code></li>
                        <li><code>2024.01.15</code> → <code>2024-01-15</code></li>
                        <li><code>Jan 15, 2024</code> → <code>2024-01-15</code></li>
                    </ul>
                </div>

                <div className="border rounded p-4">
                    <h3 className="mt-0">Numbers</h3>
                    <p className="text-sm text-slate-600 mb-2">Handles currencies, percentages, and locale formats.</p>
                    <ul className="text-sm">
                        <li><code>$1,234.56</code> → <code>1234.56</code></li>
                        <li><code>€1.234,56</code> → <code>1234.56</code></li>
                        <li><code>50%</code> → <code>0.5</code></li>
                    </ul>
                </div>
            </div>

            <h2>Schema Inference</h2>
            <p>
                The API analyzes your data to automatically detect field types (String, Number, Boolean, Date, Email)
                and assigns a confidence score to each detection.
            </p>

            <h2>Duplicate Detection</h2>
            <p>
                Identifies and flags duplicate records based on all fields or specific key fields
                configured in your schema request.
            </p>
        </div>
    );
}
