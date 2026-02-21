import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FinancialDashboard } from '../FinancialDashboard';
import {
  mockMargins,
  mockSolanaTransactions,
  mockACPStatus,
  mockSubscriptions,
  mockRevenueData,
  mockPaidAiTraces,
} from '../../mock/data';
import type { UseFinancialDataReturn } from '../../hooks/useFinancialData';

// ─── Controllable mock for useFinancialData ──────────────────────────────────

const defaultMockReturn: UseFinancialDataReturn = {
  data: {
    margins: mockMargins,
    solanaTransactions: mockSolanaTransactions,
    acpStatus: mockACPStatus,
    subscriptions: mockSubscriptions,
    revenueData: mockRevenueData,
    paidAiTraces: mockPaidAiTraces,
  },
  loading: {
    isLoading: false,
    stripeLoading: false,
    solanaLoading: false,
    marginsLoading: false,
  },
  errors: {
    stripeError: null,
    solanaError: null,
    marginsError: null,
    hasError: false,
  },
  refresh: vi.fn(),
  isLive: false,
};

let currentMockReturn = { ...defaultMockReturn };

vi.mock('../../hooks/useFinancialData', () => ({
  useFinancialData: () => currentMockReturn,
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('FinancialDashboard', () => {
  beforeEach(() => {
    currentMockReturn = { ...defaultMockReturn };
  });

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

  it('should show skeleton loaders when data is loading', () => {
    currentMockReturn = {
      ...defaultMockReturn,
      loading: {
        isLoading: true,
        stripeLoading: true,
        solanaLoading: true,
        marginsLoading: true,
      },
    };

    renderWithRouter(<FinancialDashboard />);
    // Heading is always visible regardless of loading state
    expect(screen.getByText('Financial Dashboard')).toBeInTheDocument();
    // The numeric KPI values should NOT be rendered while loading
    expect(screen.queryByText('€210.00')).not.toBeInTheDocument();
  });

  it('should show error banner when APIs fail', () => {
    currentMockReturn = {
      ...defaultMockReturn,
      errors: {
        stripeError: 'Stripe keys not configured',
        solanaError: null,
        marginsError: null,
        hasError: true,
      },
    };

    renderWithRouter(<FinancialDashboard />);
    expect(screen.getByText(/Stripe: Stripe keys not configured/)).toBeInTheDocument();
    expect(screen.getByText(/Showing cached \/ mock data as fallback/)).toBeInTheDocument();
  });
});
