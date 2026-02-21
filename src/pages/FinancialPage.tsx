import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { FinancialDashboard } from '@/components/FinancialDashboard';

export default function FinancialPage() {
  return (
    <DashboardLayout>
      <FinancialDashboard />
    </DashboardLayout>
  );
}
