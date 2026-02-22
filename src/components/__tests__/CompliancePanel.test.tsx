import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CompliancePanel } from '../CompliancePanel';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('CompliancePanel', () => {
  it('should render the panel heading', () => {
    renderWithRouter(<CompliancePanel />);
    expect(screen.getByText('Compliance & Governance')).toBeInTheDocument();
  });

  it('should display the EU AI Act checklist', () => {
    renderWithRouter(<CompliancePanel />);
    expect(screen.getByText('Regulatory Compliance Checklist')).toBeInTheDocument();
    expect(screen.getByText('AI System Disclosure')).toBeInTheDocument();
  });

  it('should display compliance scores', () => {
    renderWithRouter(<CompliancePanel />);
    expect(screen.getByText('Compliance Score')).toBeInTheDocument();
  });

  it('should display the incident log', () => {
    renderWithRouter(<CompliancePanel />);
    expect(screen.getByText('incident.io Alert Log')).toBeInTheDocument();
    expect(screen.getByText(/Kinematic Deviation — Joint 4/)).toBeInTheDocument();
  });

  it('should display the audit trail', () => {
    renderWithRouter(<CompliancePanel />);
    expect(screen.getByText('PHI Access Audit Trail')).toBeInTheDocument();
  });

  it('should display multiple regulation badges', () => {
    renderWithRouter(<CompliancePanel />);
    const euBadges = screen.getAllByText('EU-AI-ACT');
    expect(euBadges.length).toBeGreaterThanOrEqual(1);
    const doraBadges = screen.getAllByText('DORA');
    expect(doraBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('should allow escalating incidents', () => {
    renderWithRouter(<CompliancePanel />);
    const incidentTrigger = screen.getByText('Critical Kinematic Deviation — Joint 4 Wrist Rotation');
    fireEvent.click(incidentTrigger);

    const escalateButtons = screen.getAllByText('Escalate');
    expect(escalateButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(escalateButtons[0]);
  });
});
