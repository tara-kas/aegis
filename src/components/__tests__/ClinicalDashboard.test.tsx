import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ClinicalDashboard } from '../ClinicalDashboard';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ClinicalDashboard', () => {
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
});
