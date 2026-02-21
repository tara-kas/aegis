import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getMockObservationRows } from '@/lib/mock-fallback';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import MetricCard from '@/components/dashboard/MetricCard';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, FileCheck, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function ObservationsPage() {
  const { data: observations, isLoading } = useQuery({
    queryKey: ['fhir-observations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fhir_observations')
        .select('*, fhir_patients(name_family, name_given)')
        .order('created_at', { ascending: false });
      if (error || !data || data.length === 0) return getMockObservationRows();
      return data;
    },
  });

  const finalCount = observations?.filter((o) => o.status === 'final').length ?? 0;
  const prelimCount = observations?.filter((o) => o.status === 'preliminary').length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">FHIR Observations</h1>
          <p className="text-sm text-muted-foreground">Clinical data points — telemetry, diagnostics, vital signs</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard title="Total Observations" value={observations?.length ?? 0} icon={Activity} accent="clinical" />
          <MetricCard title="Final" value={finalCount} icon={FileCheck} accent="vital" />
          <MetricCard title="Preliminary" value={prelimCount} icon={AlertTriangle} accent="alert" />
        </div>

        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Effective Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))}
              {observations?.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">
                    {(o as any).fhir_patients?.name_family ?? 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="text-sm">{o.code_display ?? o.code_code}</span>
                      <span className="block font-mono text-xs text-muted-foreground">{o.code_code}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{o.category_display ?? o.category_code ?? '—'}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {o.value_quantity_value != null
                      ? `${o.value_quantity_value} ${o.value_quantity_unit ?? ''}`
                      : o.value_string ?? '—'}
                  </TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {o.effective_datetime ? format(new Date(o.effective_datetime), 'MMM d, yyyy HH:mm') : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && observations?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    No observations found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
