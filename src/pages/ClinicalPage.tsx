import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ClinicalDashboard } from '@/components/ClinicalDashboard';

export default function ClinicalPage() {
  return (
    <DashboardLayout>
      <ClinicalDashboard />
    </DashboardLayout>
  );
}
