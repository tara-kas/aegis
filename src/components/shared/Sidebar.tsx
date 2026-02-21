import { NavLink } from 'react-router-dom';
import { Activity, Wallet, ShieldCheck, Radio, Github } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: Activity, label: 'Clinical' },
  { to: '/financial', icon: Wallet, label: 'Financial' },
  { to: '/compliance', icon: ShieldCheck, label: 'Compliance' },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-aegis-700 flex items-center justify-center">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Aegis</h1>
            <p className="text-xs text-gray-500">Surgical AI Agent</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-aegis-700/20 text-aegis-400 border border-aegis-700/40'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            System Active
          </div>
          <div className="space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Webots Sim</span>
              <span className="text-green-400">Connected</span>
            </div>
            <div className="flex justify-between">
              <span>Crusoe API</span>
              <span className="text-green-400">45ms</span>
            </div>
            <div className="flex justify-between">
              <span>Supabase</span>
              <span className="text-yellow-400">Mock Mode</span>
            </div>
          </div>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-400 mt-3 transition-colors"
        >
          <Github className="w-3.5 h-3.5" />
          HackEurope 2026
        </a>
      </div>
    </aside>
  );
}
