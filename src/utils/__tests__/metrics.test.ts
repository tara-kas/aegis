import { describe, it, expect, beforeEach } from 'vitest';
import { metrics } from '../metrics';

describe('Metrics', () => {
  beforeEach(() => {
    metrics.reset();
  });

  it('should increment counters', () => {
    metrics.increment('test.counter', { env: 'test' });
    metrics.increment('test.counter', { env: 'test' }, 5);
    const all = metrics.getAll();
    expect(all).toHaveLength(2);
    expect(all[0].type).toBe('counter');
    expect(all[1].value).toBe(5);
  });

  it('should record gauge values', () => {
    metrics.gauge('test.gauge', 42);
    const all = metrics.getAll();
    expect(all[0].type).toBe('gauge');
    expect(all[0].value).toBe(42);
  });

  it('should record histogram values', () => {
    metrics.histogram('test.hist', 100);
    const all = metrics.getAll();
    expect(all[0].type).toBe('histogram');
    expect(all[0].value).toBe(100);
  });

  it('should time operations', () => {
    const stop = metrics.startTimer('test.timer');
    const duration = stop();
    expect(duration).toBeGreaterThanOrEqual(0);
    const all = metrics.getAll();
    expect(all[0].type).toBe('histogram');
  });

  it('should reset all metrics', () => {
    metrics.increment('test', {});
    metrics.reset();
    expect(metrics.getAll()).toHaveLength(0);
  });
});
