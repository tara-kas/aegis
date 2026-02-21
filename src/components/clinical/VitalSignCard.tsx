import type { VitalSign, Thresholds } from '../../types/telemetry';
import { Heart, Wind, Thermometer, Activity, Droplets } from 'lucide-react';

interface VitalSignCardProps {
  vital: VitalSign;
  thresholds?: Thresholds;
}

const VITAL_ICONS: Record<string, typeof Heart> = {
  '8867-4': Heart,
  '2708-6': Droplets,
  '8480-6': Activity,
  '8462-4': Activity,
  '19889-5': Wind,
  '9279-1': Wind,
  '8310-5': Thermometer,
};

function getSeverityColor(value: number, range: { low: number; high: number }): string {
  if (value < range.low * 0.9 || value > range.high * 1.1) return 'text-clinical-critical';
  if (value < range.low || value > range.high) return 'text-clinical-warning';
  return 'text-clinical-safe';
}

function getTrendArrow(trend: VitalSign['trend']): string {
  switch (trend) {
    case 'rising': return '↑';
    case 'falling': return '↓';
    default: return '→';
  }
}

export function VitalSignCard({ vital }: VitalSignCardProps) {
  const Icon = VITAL_ICONS[vital.code] ?? Activity;
  const color = getSeverityColor(vital.value, vital.normalRange);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-aegis-500 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Icon className="w-4 h-4" />
          <span>{vital.display}</span>
        </div>
        <span className={`text-xs font-mono ${color}`}>
          {getTrendArrow(vital.trend)}
        </span>
      </div>
      <div className={`text-3xl font-bold font-mono ${color}`}>
        {vital.value.toFixed(vital.unit === '°C' ? 1 : 0)}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-500">{vital.unit}</span>
        <span className="text-xs text-gray-600">
          {vital.normalRange.low}–{vital.normalRange.high}
        </span>
      </div>
    </div>
  );
}
