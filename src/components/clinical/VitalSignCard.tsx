import type { VitalSign, Thresholds } from '../../types/telemetry';
import { Heart, Wind, Thermometer, Activity, Droplets } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getDeviceForVital } from '@/lib/device-registry';

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
  if (value < range.low * 0.9 || value > range.high * 1.1) return 'text-destructive';
  if (value < range.low || value > range.high) return 'text-alert-amber';
  return 'text-vital-green';
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
  const device = getDeviceForVital(vital.code);

  const card = (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{vital.unit}</span>
        <span className="text-xs text-muted-foreground/60">
          {vital.normalRange.low}–{vital.normalRange.high}
        </span>
      </div>
    </div>
  );

  if (!device) return card;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1 text-xs">
          <p className="font-semibold">{device.manufacturer}</p>
          <p className="text-muted-foreground">{device.model}</p>
          <p className="text-muted-foreground">{device.type}</p>
          <p className="font-mono text-[10px] text-muted-foreground/70">
            ID {device.id} · CE Class {device.ceMarkClass}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
