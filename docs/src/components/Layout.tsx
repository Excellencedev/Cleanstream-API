
import { Sidebar } from './Sidebar';
import { Outlet } from 'react-router-dom';

export function Layout() {
    return (
        <div className="min-h-screen bg-white">
            <Sidebar />
            <main className="ml-64 p-12 max-w-4xl">
                <Outlet />
            </main>
        </div>
    );
}
