/**
 * Structured logging utility with PHI access tracking.
 * In production, swap the console transport for a HIPAA-compliant sink
 * (e.g., Supabase edge function → encrypted log store).
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'audit';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  phiAccessed?: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  audit: 4,
};

let minimumLevel: LogLevel = 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minimumLevel];
}

function emit(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;

  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]${entry.context ? ` [${entry.context}]` : ''}`;

  switch (entry.level) {
    case 'error':
      console.error(prefix, entry.message, entry.metadata ?? '');
      break;
    case 'warn':
      console.warn(prefix, entry.message, entry.metadata ?? '');
      break;
    case 'audit':
      console.info(`${prefix} [PHI=${entry.phiAccessed ?? false}]`, entry.message, entry.metadata ?? '');
      break;
    default:
      console.log(prefix, entry.message, entry.metadata ?? '');
  }
}

function createEntry(level: LogLevel, message: string, metadata?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    metadata,
  };
}

export const logger = {
  setLevel(level: LogLevel) {
    minimumLevel = level;
  },

  debug(message: string, metadata?: Record<string, unknown>) {
    emit(createEntry('debug', message, metadata));
  },

  info(message: string, metadata?: Record<string, unknown>) {
    emit(createEntry('info', message, metadata));
  },

  warn(message: string, metadata?: Record<string, unknown>) {
    emit(createEntry('warn', message, metadata));
  },

  error(message: string, metadata?: Record<string, unknown>) {
    emit(createEntry('error', message, metadata));
  },

  /** PHI access audit log — always emitted regardless of level */
  audit(message: string, resourceType: string, resourceId: string, userId: string, metadata?: Record<string, unknown>) {
    emit({
      level: 'audit',
      message,
      timestamp: new Date().toISOString(),
      phiAccessed: true,
      metadata: { resourceType, resourceId, userId, ...metadata },
    });
  },

  withContext(context: string) {
    return {
      debug: (msg: string, meta?: Record<string, unknown>) => emit({ ...createEntry('debug', msg, meta), context }),
      info: (msg: string, meta?: Record<string, unknown>) => emit({ ...createEntry('info', msg, meta), context }),
      warn: (msg: string, meta?: Record<string, unknown>) => emit({ ...createEntry('warn', msg, meta), context }),
      error: (msg: string, meta?: Record<string, unknown>) => emit({ ...createEntry('error', msg, meta), context }),
    };
  },
};
