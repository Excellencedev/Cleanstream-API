
import { NavLink } from 'react-router-dom';
import { BookOpen, Code, Terminal, Zap, Layers, Activity } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
    { icon: BookOpen, label: 'Introduction', to: '/' },
    { icon: Terminal, label: 'Getting Started', to: '/getting-started' },
    { icon: Code, label: 'API Reference', to: '/api-reference' },
    { icon: Zap, label: 'Features', to: '/features' },
    { icon: Layers, label: 'Normalization', to: '/normalization' },
    { icon: Activity, label: 'Audit & Logs', to: '/audit' },
];

export function Sidebar() {
    return (
        <div className="w-64 bg-slate-900 min-h-screen fixed left-0 top-0 text-slate-300 border-r border-slate-800">
            <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                        CS
                    </div>
                    <h1 className="text-lg font-bold text-white">CleanStream</h1>
                </div>
            </div>
            <nav className="p-4 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                                isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'hover:bg-slate-800 hover:text-white'
                            )
                        }
                    >
                        <item.icon size={18} />
                        <span className="text-sm font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}
