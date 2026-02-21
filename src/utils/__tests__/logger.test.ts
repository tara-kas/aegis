import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  it('should log info messages', () => {
    logger.info('test message');
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it('should log warnings', () => {
    logger.warn('warning message');
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('should log errors', () => {
    logger.error('error message');
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('should log audit entries for PHI access', () => {
    logger.audit('PHI accessed', 'Patient', 'p-001', 'user-001');
    expect(console.info).toHaveBeenCalledTimes(1);
  });

  it('should create contextual loggers', () => {
    const ctx = logger.withContext('TestContext');
    ctx.info('contextual message');
    expect(console.log).toHaveBeenCalledTimes(1);
  });
});
