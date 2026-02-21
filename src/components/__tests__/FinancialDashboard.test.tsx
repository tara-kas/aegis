import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FinancialDashboard } from '../FinancialDashboard';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('FinancialDashboard', () => {
  it('should render the dashboard heading', () => {
    renderWithRouter(<FinancialDashboard />);
    expect(screen.getByText('Financial Dashboard')).toBeInTheDocument();
  });

  it('should display Paid.ai trace stats', () => {
    renderWithRouter(<FinancialDashboard />);
    expect(screen.getByText('Paid.ai Successful Traces')).toBeInTheDocument();
    expect(screen.getByText('Failed Traces (€0 billed)')).toBeInTheDocument();
  });

  it('should show Solana transaction feed', () => {
    renderWithRouter(<FinancialDashboard />);
    expect(screen.getByText('Solana Token-2022 Tx Feed')).toBeInTheDocument();
  });

  it('should show Stripe ACP status', () => {
    renderWithRouter(<FinancialDashboard />);
    expect(screen.getByText('Stripe Agentic Commerce')).toBeInTheDocument();
    expect(screen.getByText('ACP active')).toBeInTheDocument();
  });

  it('should show margin tracker', () => {
    renderWithRouter(<FinancialDashboard />);
    expect(screen.getByText('Paid.ai Margin Tracker')).toBeInTheDocument();
  });

  it('should display revenue chart', () => {
    renderWithRouter(<FinancialDashboard />);
    expect(screen.getByText('Revenue / Cost / Profit')).toBeInTheDocument();
  });

  it('should flag confidential Solana transactions', () => {
    renderWithRouter(<FinancialDashboard />);
    const badges = screen.getAllByText('Confidential');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });
});
