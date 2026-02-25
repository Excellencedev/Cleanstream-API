

export function Introduction() {
    return (
        <div className="prose max-w-none">
            <h1>Introduction</h1>
            <p className="lead text-xl text-slate-600 mb-8">
                CleanStream API is a powerful data ingestion and normalization service designed to transform messy data into clean, structured JSON.
            </p>

            <div className="grid grid-cols-2 gap-6 my-8">
                <div className="p-6 border rounded-lg bg-slate-50">
                    <h3 className="text-lg font-semibold mb-2">🚀 Robust Ingestion</h3>
                    <p className="text-sm">Accepts CSV, Excel (XLSX), XML, and JSON files with ease.</p>
                </div>
                <div className="p-6 border rounded-lg bg-slate-50">
                    <h3 className="text-lg font-semibold mb-2">🧠 Smart Inference</h3>
                    <p className="text-sm">Automatically detects data types, maps headers, and infers schemas.</p>
                </div>
                <div className="p-6 border rounded-lg bg-slate-50">
                    <h3 className="text-lg font-semibold mb-2">✨ Automatic Cleaning</h3>
                    <p className="text-sm">Normalizes dates, numbers, booleans, and strings to standard formats.</p>
                </div>
                <div className="p-6 border rounded-lg bg-slate-50">
                    <h3 className="text-lg font-semibold mb-2">🔒 Production Ready</h3>
                    <p className="text-sm">Built-in authentication, rate limiting, and comprehensive audit logs.</p>
                </div>
            </div>

            <h2>Why CleanStream?</h2>
            <p>
                Building custom parsers for every data import is tedious and error-prone.
                CleanStream provides a unified API to handle all your data ingestion needs,
                ensuring consistency and reliability across your application.
            </p>
        </div>
    );
}
