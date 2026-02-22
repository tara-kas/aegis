/**
 * Data Mode Utility
 *
 * Reads VITE_DATA_MODE from the environment to determine whether
 * the application should use live APIs, mock data, or hybrid (default).
 *
 * Set via:  node scripts/data-mode.mjs
 * Or manually in .env:  VITE_DATA_MODE="mock"
 *
 * Modes:
 *   - "live"   → Only real API calls. Errors surface visibly.
 *   - "mock"   → Always use mock data. No network calls.
 *   - "hybrid" → Try live first, fall back to mock on failure. (default)
 */

export type DataMode = 'live' | 'mock' | 'hybrid';

const VALID_MODES = new Set<DataMode>(['live', 'mock', 'hybrid']);

/**
 * Returns the current data mode from the environment.
 * Defaults to 'hybrid' if not set or invalid.
 */
export function getDataMode(): DataMode {
    const raw = (import.meta.env.VITE_DATA_MODE as string | undefined)?.toLowerCase()?.trim();
    if (raw && VALID_MODES.has(raw as DataMode)) {
        return raw as DataMode;
    }
    return 'hybrid';
}

/** True when mock data should be used (mock mode, or hybrid fallback) */
export function shouldUseMock(): boolean {
    return getDataMode() !== 'live';
}

/** True when live API calls should be attempted */
export function shouldTryLive(): boolean {
    return getDataMode() !== 'mock';
}

/** True when we're in strict mock-only mode (no API calls at all) */
export function isMockOnly(): boolean {
    return getDataMode() === 'mock';
}

/** True when we're in strict live-only mode (no mock fallback) */
export function isLiveOnly(): boolean {
    return getDataMode() === 'live';
}

/** True when VITE_DATA_MODE is explicitly set to 'live'. Falls back to false (mock) if missing. */
export function isLiveMode(): boolean {
    return getDataMode() === 'live';
}
