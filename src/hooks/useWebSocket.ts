import { useEffect, useRef, useState, useCallback } from 'react';
import type { ConnectionStatus, WebSocketMessage } from '../types/telemetry';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

interface UseWebSocketOptions {
  url: string;
  reconnectIntervalMs?: number;
  maxReconnectAttempts?: number;
  heartbeatIntervalMs?: number;
  onMessage?: (message: WebSocketMessage) => void;
  enabled?: boolean;
}

interface UseWebSocketReturn {
  status: ConnectionStatus;
  lastMessage: WebSocketMessage | null;
  send: (message: WebSocketMessage) => void;
  reconnect: () => void;
  disconnect: () => void;
}

const log = logger.withContext('WebSocket');

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    reconnectIntervalMs = 3000,
    maxReconnectAttempts = 10,
    heartbeatIntervalMs = 30000,
    onMessage,
    enabled = true,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;
    cleanup();
    setStatus('connecting');
    log.info('Connecting', { url });

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        log.info('Connected');
        setStatus('connected');
        reconnectCountRef.current = 0;
        metrics.increment('ws.connections', { url });

        heartbeatTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', payload: null, timestamp: new Date().toISOString() }));
          }
        }, heartbeatIntervalMs);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(message);
          onMessage?.(message);
          metrics.increment('ws.messages_received', { url, type: message.type });
        } catch {
          log.warn('Failed to parse message', { data: event.data });
        }
      };

      ws.onerror = () => {
        log.error('Connection error');
        setStatus('error');
        metrics.increment('ws.errors', { url });
      };

      ws.onclose = () => {
        log.info('Disconnected');
        setStatus('disconnected');
        if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);

        if (reconnectCountRef.current < maxReconnectAttempts && enabled) {
          const delay = reconnectIntervalMs * Math.pow(2, Math.min(reconnectCountRef.current, 5));
          log.info(`Reconnecting in ${delay}ms (attempt ${reconnectCountRef.current + 1}/${maxReconnectAttempts})`);
          reconnectCountRef.current++;
          reconnectTimerRef.current = setTimeout(connect, delay);
        } else if (reconnectCountRef.current >= maxReconnectAttempts) {
          log.error('Max reconnect attempts reached');
          setStatus('error');
        }
      };
    } catch (err) {
      log.error('Failed to create WebSocket', { error: (err as Error).message });
      setStatus('error');
    }
  }, [url, enabled, reconnectIntervalMs, maxReconnectAttempts, heartbeatIntervalMs, onMessage, cleanup]);

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      metrics.increment('ws.messages_sent', { url, type: message.type });
    } else {
      log.warn('Cannot send — not connected');
    }
  }, [url]);

  const reconnect = useCallback(() => {
    reconnectCountRef.current = 0;
    connect();
  }, [connect]);

  const disconnect = useCallback(() => {
    reconnectCountRef.current = maxReconnectAttempts;
    cleanup();
    setStatus('disconnected');
  }, [cleanup, maxReconnectAttempts]);

  useEffect(() => {
    if (enabled) connect();
    return cleanup;
  }, [enabled, connect, cleanup]);

  return { status, lastMessage, send, reconnect, disconnect };
}
