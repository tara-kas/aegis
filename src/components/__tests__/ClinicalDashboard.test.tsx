import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ClinicalDashboard } from '../ClinicalDashboard';
import { resetTraceStore } from '@/api/telemetry-billing';
import { _resetForTesting as resetIncidentCommander } from '@/api/reliability-agents';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter><TooltipProvider>{ui}</TooltipProvider></MemoryRouter>);
}

describe('ClinicalDashboard', () => {
  beforeEach(() => {
    resetTraceStore();
    resetIncidentCommander();
  });

  it('should render the dashboard heading', () => {
    renderWithRouter(<ClinicalDashboard />);
    expect(screen.getByText('Clinician Dashboard')).toBeInTheDocument();
  });

  it('should render patient information', () => {
    renderWithRouter(<ClinicalDashboard patientId="patient-001" />);
    expect(screen.getAllByText(/Nakamura/).length).toBeGreaterThanOrEqual(1);
  });

  it('should display vital sign cards', () => {
    renderWithRouter(<ClinicalDashboard />);
    expect(screen.getAllByText('Heart Rate').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/SpO/).length).toBeGreaterThanOrEqual(1);
  });

  it('should show anomaly alerts', () => {
    renderWithRouter(<ClinicalDashboard />);
    expect(screen.getByText('Kinematic Deviation Detected')).toBeInTheDocument();
  });

  it('should show telemetry stream controls', () => {
    renderWithRouter(<ClinicalDashboard />);
    const stop = screen.queryByText('Stop Telemetry');
    const start = screen.queryByText('Start Telemetry');
    expect(stop ?? start).toBeInTheDocument();
  });

  it('should render the encounter timeline', () => {
    renderWithRouter(<ClinicalDashboard />);
    expect(screen.getByText('Encounter Timeline')).toBeInTheDocument();
  });

  it('should render the Voice Scribe widget', () => {
    renderWithRouter(<ClinicalDashboard />);
    expect(screen.getByTestId('voice-scribe-widget')).toBeInTheDocument();
    expect(screen.getByText('Voice Scribe')).toBeInTheDocument();
  });

  it('should show Start Dictation button for the scribe', () => {
    renderWithRouter(<ClinicalDashboard />);
    expect(screen.getByLabelText('Start Dictation')).toBeInTheDocument();
  });
});
