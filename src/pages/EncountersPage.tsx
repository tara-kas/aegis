import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getMockEncounterRows } from '@/lib/mock-fallback';
import { isMockOnly } from '@/lib/data-mode';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import MetricCard from '@/components/dashboard/MetricCard';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Stethoscope, Clock, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function EncountersPage() {
  const { data: encounters, isLoading } = useQuery({
    queryKey: ['fhir-encounters'],
    queryFn: async () => {
      if (isMockOnly()) return getMockEncounterRows();
      const { data, error } = await supabase
        .from('fhir_encounters')
        .select('*, fhir_patients(name_family, name_given)')
        .order('created_at', { ascending: false });
      if (error || !data || data.length === 0) return getMockEncounterRows();
      return data;
    },
  });

  const inProgress = encounters?.filter((e) => e.status === 'in-progress').length ?? 0;
  const completed = encounters?.filter((e) => e.status === 'completed' || e.status === 'finished').length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">FHIR Encounters</h1>
          <p className="text-sm text-muted-foreground">Context of care — inpatient/outpatient status, timestamps, locations</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard title="Total Encounters" value={encounters?.length ?? 0} icon={Stethoscope} accent="clinical" />
          <MetricCard title="In Progress" value={inProgress} icon={Clock} accent="alert" />
          <MetricCard title="Completed" value={completed} icon={CheckCircle} accent="vital" />
        </div>

        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period Start</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead className="hidden lg:table-cell">Location</TableHead>
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
              {encounters?.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    {(e as any).fhir_patients?.name_family ?? 'Unknown'}
                  </TableCell>
                  <TableCell className="text-sm">{e.type_display ?? e.class_display ?? e.class_code}</TableCell>
                  <TableCell><StatusBadge status={e.status} /></TableCell>
                  <TableCell>{e.period_start ? format(new Date(e.period_start), 'MMM d, yyyy HH:mm') : '—'}</TableCell>
                  <TableCell>{e.period_end ? format(new Date(e.period_end), 'MMM d, yyyy HH:mm') : '—'}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {e.location_display ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && encounters?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    No encounters found.
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
