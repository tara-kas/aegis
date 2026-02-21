import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/shared/Layout';
import { ClinicalDashboard } from './components/ClinicalDashboard';
import { FinancialDashboard } from './components/FinancialDashboard';
import { CompliancePanel } from './components/CompliancePanel';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ClinicalDashboard />} />
          <Route path="financial" element={<FinancialDashboard />} />
          <Route path="compliance" element={<CompliancePanel />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
