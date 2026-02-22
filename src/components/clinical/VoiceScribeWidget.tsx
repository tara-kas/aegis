/**
 * Voice Scribe Widget — Clinical Dashboard Microphone Button
 *
 * Phase 4: Autonomous Medical Voice Agent (Frontend UI)
 *
 * State machine:
 *   idle → recording → processing → success (→ idle on re-click)
 *                                 → error   (→ idle on re-click)
 *
 * Pipeline:
 *   1. User clicks mic → "recording" (pulsing red)
 *   2. User clicks again to stop → "processing" (spinner)
 *   3. Calls processScribeObservation(null) which internally:
 *      a. transcribeAudioMock() → surgical transcript
 *      b. transcriptToFhirObservation() → FHIR R4 Observation
 *      c. traceObservationWorkflow() → Paid.ai $125.00 trace
 *   4. On success: toast notification, fires onObservationCreated
 *      so the parent ClinicalDashboard surfaces the observation
 *      and the FinancialDashboard picks up the billing trace
 *      via the onTraceRecorded listener — no page refresh needed.
 */

import { useState, useCallback } from 'react';
import { Mic, MicOff, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  processScribeObservation,
  SCRIBE_BILLED_AMOUNT,
  type ScribeObservationResult,
} from '@/api/voice-scribe';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ScribeState = 'idle' | 'recording' | 'processing' | 'success' | 'error';

export interface VoiceScribeWidgetProps {
  /** Called after a successful scribe observation so the parent can react */
  onObservationCreated?: (result: ScribeObservationResult) => void;
}

// ─── State → visual config ───────────────────────────────────────────────────

interface StateVisual {
  icon: typeof Mic;
  label: string;
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  pulse: boolean;
  disabled: boolean;
}

const STATE_CONFIG: Record<ScribeState, StateVisual> = {
  idle:       { icon: Mic,            label: 'Start Dictation', variant: 'default',     pulse: false, disabled: false },
  recording:  { icon: MicOff,         label: 'Stop Recording',  variant: 'destructive', pulse: true,  disabled: false },
  processing: { icon: Loader2,        label: 'Processing…',     variant: 'secondary',   pulse: false, disabled: true  },
  success:    { icon: CheckCircle,    label: 'Dictate Again',   variant: 'outline',     pulse: false, disabled: false },
  error:      { icon: AlertTriangle,  label: 'Retry',           variant: 'destructive', pulse: false, disabled: false },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function VoiceScribeWidget({ onObservationCreated }: VoiceScribeWidgetProps) {
  const [state, setState] = useState<ScribeState>('idle');
  const [lastResult, setLastResult] = useState<ScribeObservationResult | null>(null);
  const { toast } = useToast();

  const handleClick = useCallback(async () => {
    if (state === 'idle' || state === 'success' || state === 'error') {
      // ── Start "recording" ───────────────────────────────────────
      setState('recording');
      setLastResult(null);
      return;
    }

    if (state === 'recording') {
      // ── Stop recording → process ───────────────────────────────
      setState('processing');

      try {
        // Simulate the 2-second processing delay, then run the
        // full mock pipeline (transcribe → FHIR → Paid.ai $125)
        await new Promise((r) => setTimeout(r, 2000));

        // `null` audioBlob triggers transcribeAudioMock() inside the pipeline
        const result = await processScribeObservation(null);

        setLastResult(result);
        setState('success');

        const vitalDisplay =
          result.observation.valueQuantity
            ? `${result.observation.valueQuantity.value} ${result.observation.valueQuantity.unit}`
            : result.observation.valueString ?? 'Clinical note';

        toast({
          title: '✅ Voice Scribe — Observation Created',
          description: `"${result.transcript.slice(0, 80)}…" — Vital: ${vitalDisplay} — Billed: $${SCRIBE_BILLED_AMOUNT.toFixed(2)} via Paid.ai`,
        });

        // Notify parent so ClinicalDashboard can surface the observation
        onObservationCreated?.(result);
      } catch (err) {
        setState('error');
        const message = err instanceof Error ? err.message : 'Unknown error';
        toast({
          title: '❌ Voice Scribe Failed',
          description: message,
          variant: 'destructive',
        });
      }
    }
    // state === 'processing' → ignore clicks (debounce)
  }, [state, toast, onObservationCreated]);

  // ── Render ──────────────────────────────────────────────────────────────

  const cfg = STATE_CONFIG[state];
  const Icon = cfg.icon;

  return (
    <Card className="border-primary/20" data-testid="voice-scribe-widget">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Mic className="h-4 w-4 text-primary" />
          Voice Scribe
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            ElevenLabs → FHIR → Paid.ai
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 pt-2">
        {/* ── Main microphone button ───────────────────────────── */}
        <Button
          onClick={handleClick}
          variant={cfg.variant}
          disabled={cfg.disabled}
          size="lg"
          data-testid="scribe-mic-button"
          className={cn(
            'relative h-20 w-20 rounded-full transition-all',
            cfg.pulse && 'animate-pulse ring-4 ring-destructive/40',
          )}
          aria-label={cfg.label}
        >
          <Icon className={cn('h-8 w-8', state === 'processing' && 'animate-spin')} />
        </Button>

        <span className="text-xs font-medium text-muted-foreground">{cfg.label}</span>

        {/* ── Recording indicator ──────────────────────────────── */}
        {state === 'recording' && (
          <div className="flex items-center gap-2 text-xs text-destructive" data-testid="scribe-recording-indicator">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
            </span>
            Listening… click to stop
          </div>
        )}

        {/* ── Last result summary ──────────────────────────────── */}
        {lastResult && state === 'success' && (
          <div className="w-full space-y-1.5 rounded-md bg-muted p-3 text-xs" data-testid="scribe-result">
            <p className="font-medium text-foreground">
              {lastResult.observation.code.text ?? 'Observation'}
            </p>
            <p className="text-muted-foreground">
              &ldquo;{lastResult.transcript.slice(0, 100)}&rdquo;
            </p>
            <div className="flex items-center justify-between pt-1 text-muted-foreground">
              <span>
                {lastResult.observation.valueQuantity
                  ? `${lastResult.observation.valueQuantity.value} ${lastResult.observation.valueQuantity.unit}`
                  : lastResult.observation.valueString ?? '—'}
              </span>
              <span className="font-mono text-green-600 dark:text-green-400">
                ${lastResult.billing.trace.billedAmount.toFixed(2)}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              Trace: {lastResult.billing.trace.traceId} · {lastResult.billing.trace.outcome}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
