import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
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
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-aegis-400" />
          <h3 className="text-sm font-medium text-gray-300">Revenue / Cost / Profit</h3>
        </div>
        <span className="text-xs text-gray-500">Last {timeRange}</span>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#338dff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#338dff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="url(#gradRevenue)" strokeWidth={2} name="Revenue (€)" />
            <Area type="monotone" dataKey="profit" stroke="#338dff" fill="url(#gradProfit)" strokeWidth={2} name="Profit (€)" />
            <Line type="monotone" dataKey="costs" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Costs (€)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
