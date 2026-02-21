import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTelemetry } from '../useTelemetry';

describe('useTelemetry hook', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialise with mock vital signs', () => {
    const { result } = renderHook(() => useTelemetry({ deviceId: 'test-device', vitalIntervalMs: 60000, kinematicIntervalMs: 60000 }));
    expect(result.current.vitals.length).toBe(7);
  });

  it('should initialise with default anomaly alerts', () => {
    const { result } = renderHook(() => useTelemetry({ deviceId: 'test-device', vitalIntervalMs: 60000, kinematicIntervalMs: 60000 }));
    expect(result.current.alerts.length).toBeGreaterThanOrEqual(2);
  });

  it('should acknowledge an alert', () => {
    const { result } = renderHook(() => useTelemetry({ deviceId: 'test-device', vitalIntervalMs: 60000, kinematicIntervalMs: 60000 }));
    const alertId = result.current.alerts[0].id;

    act(() => {
      result.current.acknowledgeAlert(alertId);
    });

    const acked = result.current.alerts.find((a) => a.id === alertId);
    expect(acked?.acknowledged).toBe(true);
  });

  it('should dismiss an alert', () => {
    const { result } = renderHook(() => useTelemetry({ deviceId: 'test-device', vitalIntervalMs: 60000, kinematicIntervalMs: 60000 }));
    const initialCount = result.current.alerts.length;
    const alertId = result.current.alerts[0].id;

    act(() => {
      result.current.dismissAlert(alertId);
    });

    expect(result.current.alerts.length).toBe(initialCount - 1);
  });

  it('should stop stream when stopStream is called', () => {
    const { result } = renderHook(() => useTelemetry({ deviceId: 'test-device', vitalIntervalMs: 60000, kinematicIntervalMs: 60000 }));

    act(() => {
      result.current.stopStream();
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.connectionStatus).toBe('disconnected');
  });
});
