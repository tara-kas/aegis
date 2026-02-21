import { NavLink } from 'react-router-dom';
import { Activity, Wallet, ShieldCheck, Radio, Github } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: Activity, label: 'Clinical' },
  { to: '/financial', icon: Wallet, label: 'Financial' },
  { to: '/compliance', icon: ShieldCheck, label: 'Compliance' },
];

/** @deprecated Use DashboardLayout instead */
export function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Radio className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">Aegis</h1>
            <p className="text-xs text-muted-foreground">Surgical AI Agent</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-muted p-3">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 animate-pulse rounded-full bg-vital-green" />
            System Active
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Webots Sim</span>
              <span className="text-vital-green">Connected</span>
            </div>
            <div className="flex justify-between">
              <span>Crusoe API</span>
              <span className="text-vital-green">45ms</span>
            </div>
            <div className="flex justify-between">
              <span>Supabase</span>
              <span className="text-alert-amber">Mock Mode</span>
            </div>
          </div>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-2 text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground"
        >
          <Github className="w-3.5 h-3.5" />
          HackEurope 2026
        </a>
      </div>
    </aside>
  );
}
