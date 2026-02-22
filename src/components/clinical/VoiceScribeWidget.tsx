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
 *   3. Calls processScribeObservation(audioBlob) which internally:
 *      a. transcribeAudioLive(audioBlob) → ElevenLabs STT (or mock fallback)
 *      b. transcriptToFhirObservation() → FHIR R4 Observation
 *      c. traceObservationWorkflow() → Paid.ai $125.00 trace
 *   4. On success: toast notification, fires onObservationCreated
 *      so the parent ClinicalDashboard surfaces the observation
 *      and the FinancialDashboard picks up the billing trace
 *      via the onTraceRecorded listener — no page refresh needed.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, CheckCircle, AlertTriangle, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  processScribeObservation,
  SCRIBE_BILLED_AMOUNT,
  type ScribeObservationResult,
  type GeminiInsights,
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
  idle: { icon: Mic, label: 'Start Dictation', variant: 'default', pulse: false, disabled: false },
  recording: { icon: MicOff, label: 'Stop Recording', variant: 'destructive', pulse: true, disabled: false },
  processing: { icon: Loader2, label: 'Processing…', variant: 'secondary', pulse: false, disabled: true },
  success: { icon: CheckCircle, label: 'Dictate Again', variant: 'outline', pulse: false, disabled: false },
  error: { icon: AlertTriangle, label: 'Retry', variant: 'destructive', pulse: false, disabled: false },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function VoiceScribeWidget({ onObservationCreated }: VoiceScribeWidgetProps) {
  const [state, setState] = useState<ScribeState>('idle');
  const [lastResult, setLastResult] = useState<ScribeObservationResult | null>(null);
  const { toast } = useToast();

  // ── MediaRecorder refs ──────────────────────────────────────────
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Cleanup on unmount (release mic if still active) ────────────
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (state === 'idle' || state === 'success' || state === 'error') {
      // ── Start recording with real microphone ────────────────────
      setLastResult(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        audioChunksRef.current = [];

        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e: BlobEvent) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.start();
        setState('recording');
      } catch (err) {
        // Microphone permission denied or unavailable
        setState('idle');
        toast({
          title: '❌ Microphone Access Denied',
          description:
            err instanceof Error
              ? err.message
              : 'Could not access microphone. Please allow microphone permissions and try again.',
          variant: 'destructive',
        });
      }
      return;
    }

    if (state === 'recording') {
      // ── Stop recording → process via live pipeline ──────────────
      setState('processing');

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        setState('error');
        toast({
          title: '❌ Recording Error',
          description: 'MediaRecorder was not active. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      try {
        // Wait for the recorder to flush remaining data and fire onstop
        const audioBlob = await new Promise<Blob>((resolve) => {
          recorder.onstop = () => {
            const mimeType = recorder.mimeType || 'audio/webm';
            const blob = new Blob(audioChunksRef.current, { type: mimeType });
            resolve(blob);
          };
          recorder.stop();
        });

        // Release the microphone
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;

        // Run the full pipeline: transcribeAudioLive → FHIR → Paid.ai $125
        const result = await processScribeObservation(audioBlob);

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

        // If Gemini flagged critical warnings, alert the surgeon immediately
        if (result.geminiInsights?.criticalWarnings) {
          toast({
            title: '⚠️ Gemini Clinical Warning',
            description: result.geminiInsights.criticalWarnings,
            variant: 'destructive',
          });
        }

        // Notify parent so ClinicalDashboard can surface the observation
        onObservationCreated?.(result);
      } catch (err) {
        // Release mic on error too
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;

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

  const handleDownloadPDF = useCallback(() => {
    if (!lastResult) return;

    const doc = new jsPDF();
    const margin = 20;
    let cursorY = margin;

    // Hospital Header
    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175); // Primary Blue
    doc.text('Aegis Clinical Dictation', margin, cursorY);
    cursorY += 8;

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Muted foreground
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, cursorY);
    cursorY += 15;

    // Separator line
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, cursorY, 190, cursorY);
    cursorY += 10;

    // Scribe Details
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // Foreground
    doc.text('Observation Summary', margin, cursorY);
    cursorY += 8;

    doc.setFontSize(11);
    doc.text(`FHIR Code: ${lastResult.observation.code.text ?? 'Unknown Observation'}`, margin, cursorY);
    cursorY += 6;

    const val = lastResult.observation.valueQuantity
      ? `${lastResult.observation.valueQuantity.value} ${lastResult.observation.valueQuantity.unit}`
      : lastResult.observation.valueString ?? 'N/A';
    doc.text(`Computed Value: ${val}`, margin, cursorY);
    cursorY += 10;

    // Transcript
    doc.setFontSize(14);
    doc.text('Original Transcript', margin, cursorY);
    cursorY += 8;

    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    const splitTranscript = doc.splitTextToSize(`"${lastResult.transcript}"`, 170);
    doc.text(splitTranscript, margin, cursorY);
    cursorY += splitTranscript.length * 6 + 10;

    // Gemini Insights
    if (lastResult.geminiInsights) {
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('AI Medical Insights', margin, cursorY);
      cursorY += 8;

      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text(`Predicted Procedure: ${lastResult.geminiInsights.procedure}`, margin, cursorY);
      cursorY += 6;

      if (lastResult.geminiInsights.criticalWarnings) {
        doc.setTextColor(220, 38, 38); // Destructive / Red
        const warnings = doc.splitTextToSize(`WARNING: ${lastResult.geminiInsights.criticalWarnings}`, 170);
        doc.text(warnings, margin, cursorY);
        cursorY += warnings.length * 6;
      }
      cursorY += 4;
    }

    // Billing Footnote
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // Muted
    doc.text(
      `Billing Trace ID: ${lastResult.billing.trace.traceId} • Billed: $${lastResult.billing.trace.billedAmount.toFixed(2)} via Paid.ai`,
      margin,
      280
    );

    // Save PDF
    const safeDate = new Date().toISOString().slice(0, 10);
    doc.save(`clinical-note-${safeDate}.pdf`);

    toast({
      title: 'PDF Downloaded',
      description: 'Your clinical note has been exported to PDF successfully.',
    });
  }, [lastResult, toast]);

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

            {/* ── Gemini Clinical Insights ──────────────────────── */}
            {lastResult.geminiInsights && (
              <div className="mt-2 space-y-1 border-t border-border pt-2" data-testid="scribe-gemini-insights">
                <p className="font-medium text-primary">
                  🧠 Gemini Insights
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium">Procedure:</span>{' '}
                  {lastResult.geminiInsights.procedure}
                </p>
                {lastResult.geminiInsights.criticalWarnings && (
                  <p className="font-medium text-destructive" data-testid="scribe-gemini-warning">
                    ⚠️ {lastResult.geminiInsights.criticalWarnings}
                  </p>
                )}
                <p className="text-muted-foreground">
                  <span className="font-medium">Observation Value:</span>{' '}
                  {lastResult.geminiInsights.fhirObservationValue}
                </p>
              </div>
            )}

            {/* ── PDF Download Button ──────────────────────────── */}
            <div className="pt-3 border-t border-border mt-3">
              <Button
                variant="default"
                size="sm"
                className="w-full gap-2 bg-primary/90 hover:bg-primary shadow-sm"
                onClick={handleDownloadPDF}
              >
                <FileDown className="w-4 h-4" />
                Export Note as PDF
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
