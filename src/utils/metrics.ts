/**
 * Lightweight metrics collection stubs.
 * Tracks counters, gauges, and histograms in-memory.
 * In production, flush to an OpenTelemetry collector.
 */

interface MetricEntry {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

const store: MetricEntry[] = [];

export const metrics = {
  increment(name: string, labels: Record<string, string> = {}, delta = 1) {
    store.push({ name, type: 'counter', value: delta, labels, timestamp: Date.now() });
  },

  gauge(name: string, value: number, labels: Record<string, string> = {}) {
    store.push({ name, type: 'gauge', value, labels, timestamp: Date.now() });
  },

  histogram(name: string, value: number, labels: Record<string, string> = {}) {
    store.push({ name, type: 'histogram', value, labels, timestamp: Date.now() });
  },

  /** Returns a timer function — call the returned fn to record duration */
  startTimer(name: string, labels: Record<string, string> = {}) {
    const start = performance.now();
    return () => {
      const durationMs = performance.now() - start;
      this.histogram(name, durationMs, labels);
      return durationMs;
    };
  },

  getAll(): readonly MetricEntry[] {
    return store;
  },

  reset() {
    store.length = 0;
  },
};
