import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getMockPatientRows } from '@/lib/mock-fallback';
import { isMockOnly } from '@/lib/data-mode';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import MetricCard from '@/components/dashboard/MetricCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, UserX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function PatientsPage() {
  const { data: patients, isLoading } = useQuery({
    queryKey: ['fhir-patients'],
    queryFn: async () => {
      if (isMockOnly()) return getMockPatientRows();
      const { data, error } = await supabase
        .from('fhir_patients')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data || data.length === 0) return getMockPatientRows();
      return data;
    },
  });

  const activeCount = patients?.filter((p) => p.active).length ?? 0;
  const inactiveCount = (patients?.length ?? 0) - activeCount;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">FHIR Patients</h1>
          <p className="text-sm text-muted-foreground">Patient identity anchors — demographics and medical record numbers</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard title="Total Patients" value={patients?.length ?? 0} icon={Users} accent="clinical" />
          <MetricCard title="Active" value={activeCount} icon={UserCheck} accent="vital" />
          <MetricCard title="Inactive" value={inactiveCount} icon={UserX} accent="alert" />
        </div>

        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Identifier</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Birth Date</TableHead>
                <TableHead>Status</TableHead>
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
              {patients?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.name_family}{p.name_given?.length ? `, ${p.name_given.join(' ')}` : ''}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.identifier_value ?? '—'}
                  </TableCell>
                  <TableCell className="capitalize">{p.gender ?? '—'}</TableCell>
                  <TableCell>{p.birth_date ? format(new Date(p.birth_date), 'yyyy-MM-dd') : '—'}</TableCell>
                  <TableCell>
                    <Badge className={p.active ? 'bg-vital-green text-vital-green-foreground' : 'bg-muted text-muted-foreground'}>
                      {p.active ? 'active' : 'inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {[p.address_city, p.address_country].filter(Boolean).join(', ') || '—'}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && patients?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    No patient records found.
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
