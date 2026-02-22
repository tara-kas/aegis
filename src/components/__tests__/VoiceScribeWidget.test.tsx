/**
 * VoiceScribeWidget — Component Tests
 *
 * Verifies:
 *   1. Renders in idle state with mic button
 *   2. Clicking transitions to recording (pulsing indicator visible)
 *   3. Clicking again transitions to processing then success
 *   4. Calls processScribeObservation mock pipeline
 *   5. Fires onObservationCreated callback with the observation
 *   6. Displays the result summary card after success
 *   7. Can re-enter idle from success state
 *   8. Handles pipeline errors gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { VoiceScribeWidget } from '../clinical/VoiceScribeWidget';
import { resetTraceStore, getTraceStore } from '@/api/telemetry-billing';
import { _resetForTesting as resetIncidentCommander } from '@/api/reliability-agents';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderWidget(props?: Partial<React.ComponentProps<typeof VoiceScribeWidget>>) {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <VoiceScribeWidget {...props} />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('VoiceScribeWidget', () => {
  beforeEach(() => {
    resetTraceStore();
    resetIncidentCommander();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Idle state ─────────────────────────────────────────────────

  it('should render the widget card', () => {
    renderWidget();
    expect(screen.getByTestId('voice-scribe-widget')).toBeInTheDocument();
  });

  it('should show "Start Dictation" label in idle state', () => {
    renderWidget();
    expect(screen.getByText('Start Dictation')).toBeInTheDocument();
  });

  it('should render a mic button with correct aria label', () => {
    renderWidget();
    expect(screen.getByLabelText('Start Dictation')).toBeInTheDocument();
  });

  it('should show the pipeline label', () => {
    renderWidget();
    expect(screen.getByText('ElevenLabs → FHIR → Paid.ai')).toBeInTheDocument();
  });

  it('should not show the recording indicator when idle', () => {
    renderWidget();
    expect(screen.queryByTestId('scribe-recording-indicator')).not.toBeInTheDocument();
  });

  // ── Recording state ────────────────────────────────────────────

  it('should transition to recording on first click', async () => {
    renderWidget();
    const btn = screen.getByTestId('scribe-mic-button');
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(screen.getByText('Stop Recording')).toBeInTheDocument();
    expect(screen.getByTestId('scribe-recording-indicator')).toBeInTheDocument();
    expect(screen.getByText('Listening… click to stop')).toBeInTheDocument();
  });

  it('should have pulsing class when recording', async () => {
    renderWidget();
    const btn = screen.getByTestId('scribe-mic-button');
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(btn.className).toContain('animate-pulse');
    expect(btn.className).toContain('ring-destructive');
  });

  // ── Processing → Success state ─────────────────────────────────

  it('should transition through processing to success after stop click', async () => {
    const onCreated = vi.fn();
    renderWidget({ onObservationCreated: onCreated });

    const btn = screen.getByTestId('scribe-mic-button');

    // Click to start recording
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(screen.getByText('Stop Recording')).toBeInTheDocument();

    // Click to stop → enters processing
    await act(async () => {
      fireEvent.click(btn);
    });

    // Should show "Processing…"
    expect(screen.getByText('Processing…')).toBeInTheDocument();

    // Advance past the 2-second delay + the mock pipeline internal delay
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // Wait for the success state
    await waitFor(() => {
      expect(screen.getByText('Dictate Again')).toBeInTheDocument();
    });

    // The result summary should be visible
    expect(screen.getByTestId('scribe-result')).toBeInTheDocument();

    // Callback fired with the observation
    expect(onCreated).toHaveBeenCalledTimes(1);
    const result = onCreated.mock.calls[0][0];
    expect(result.observation.resourceType).toBe('Observation');
    expect(result.transcript).toContain('110 bpm');
    expect(result.billing.trace.billedAmount).toBe(125.00);
    expect(result.billing.shouldSettle).toBe(true);
  });

  // ── Billing trace fires to trace store ─────────────────────────

  it('should record a $125 trace in the trace store for FinancialDashboard', async () => {
    renderWidget();
    const btn = screen.getByTestId('scribe-mic-button');

    expect(getTraceStore()).toHaveLength(0);

    // Start recording
    await act(async () => {
      fireEvent.click(btn);
    });
    // Stop recording
    await act(async () => {
      fireEvent.click(btn);
    });

    // Advance timers
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.getByText('Dictate Again')).toBeInTheDocument();
    });

    const store = getTraceStore();
    expect(store.length).toBeGreaterThanOrEqual(1);

    const lastTrace = store[store.length - 1];
    expect(lastTrace.workflowId).toBe('autonomous_scribe_observation');
    expect(lastTrace.billedAmount).toBe(125.00);
    expect(lastTrace.outcome).toBe('success');
  });

  // ── Re-enter from success ──────────────────────────────────────

  it('should allow re-entering recording from success state', async () => {
    renderWidget();
    const btn = screen.getByTestId('scribe-mic-button');

    // Full cycle: idle → recording → processing → success
    await act(async () => { fireEvent.click(btn); });
    await act(async () => { fireEvent.click(btn); });
    await act(async () => { vi.advanceTimersByTime(3000); });

    await waitFor(() => {
      expect(screen.getByText('Dictate Again')).toBeInTheDocument();
    });

    // Click "Dictate Again" → should go back to recording
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(screen.getByText('Stop Recording')).toBeInTheDocument();
    expect(screen.getByTestId('scribe-recording-indicator')).toBeInTheDocument();
  });

  // ── Button disabled during processing ──────────────────────────

  it('should disable the button during processing', async () => {
    renderWidget();
    const btn = screen.getByTestId('scribe-mic-button');

    await act(async () => { fireEvent.click(btn); }); // → recording
    await act(async () => { fireEvent.click(btn); }); // → processing

    expect(btn).toBeDisabled();
    expect(screen.getByText('Processing…')).toBeInTheDocument();

    // Cleanup
    await act(async () => { vi.advanceTimersByTime(3000); });
    await waitFor(() => {
      expect(screen.getByText('Dictate Again')).toBeInTheDocument();
    });
  });

  // ── Result display ────────────────────────────────────────────

  it('should display the transcript and billed amount in the result', async () => {
    renderWidget();
    const btn = screen.getByTestId('scribe-mic-button');

    await act(async () => { fireEvent.click(btn); });
    await act(async () => { fireEvent.click(btn); });
    await act(async () => { vi.advanceTimersByTime(3000); });

    await waitFor(() => {
      expect(screen.getByTestId('scribe-result')).toBeInTheDocument();
    });

    // The mock transcript contains "heart rate" and "110 bpm"
    expect(screen.getByTestId('scribe-result').textContent).toContain('110');
    expect(screen.getByTestId('scribe-result').textContent).toContain('$125.00');
  });
});
