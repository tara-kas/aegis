import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import type { RevenueDataPoint, TimeRange } from '../../types/financial';
import { BarChart3 } from 'lucide-react';

interface RevenueChartProps {
  data: RevenueDataPoint[];
  timeRange: TimeRange;
}

function formatHour(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function RevenueChart({ data, timeRange }: RevenueChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    time: formatHour(d.timestamp),
  }));

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 p-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground/80">Revenue / Cost / Profit</h3>
        </div>
        <span className="text-xs text-muted-foreground">Last {timeRange}</span>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(168, 76%, 36%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(168, 76%, 36%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(199, 89%, 38%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(199, 89%, 38%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'hsl(var(--card-foreground))',
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Area type="monotone" dataKey="revenue" stroke="hsl(168, 76%, 36%)" fill="url(#gradRevenue)" strokeWidth={2} name="Revenue (€)" />
            <Area type="monotone" dataKey="profit" stroke="hsl(199, 89%, 38%)" fill="url(#gradProfit)" strokeWidth={2} name="Profit (€)" />
            <Line type="monotone" dataKey="costs" stroke="hsl(0, 72%, 51%)" strokeWidth={1.5} dot={false} name="Costs (€)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
