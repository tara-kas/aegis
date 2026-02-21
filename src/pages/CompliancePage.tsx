import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { CompliancePanel } from '@/components/CompliancePanel';

export default function CompliancePage() {
  return (
    <DashboardLayout>
      <CompliancePanel />
    </DashboardLayout>
  );
}
