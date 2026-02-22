/**
 * Incident Commander — Reliability Agent for EU AI Act Compliance
 *
 * Monitors the telemetry stream for safety-critical conditions:
 *   1. Kinematic latency exceeding 200 ms
 *   2. Anomaly detection (isAnomalous flag on KinematicFrame)
 *
 * When a threshold is breached this agent:
 *   • Immediately halts the paidClient.trace() billing pipeline
 *   • Creates a structured Incident (incident.io format)
 *   • Emits AnomalyAlert records for the UI anomaly banner
 *   • Formats a remediation payload for a Slack webhook
 *
 * EU AI Act references:
 *   Art. 9  — Risk management system (continuous monitoring)
 *   Art. 14 — Human oversight (automated halt + surgeon notification)
 *   DORA Art. 19 — Incident reporting framework
 */

import type { KinematicFrame, AnomalyAlert } from '../types/telemetry';
import type { Incident } from '../types/compliance';
import { logger } from '../utils/logger';

// ─── Configuration ───────────────────────────────────────────────────────────

/** Maximum acceptable latency between consecutive kinematic frames (ms) */
export const LATENCY_THRESHOLD_MS = 200;

/** Anomaly score above which the frame is considered safety-critical */
export const ANOMALY_SCORE_THRESHOLD = 0.7;

/** Maximum age of telemetry data before considered stale (ms) */
export const STALE_TELEMETRY_THRESHOLD_MS = 5000;

// ─── Billing Circuit-Breaker ─────────────────────────────────────────────────

/**
 * Global circuit-breaker flag.
 *
 * When `true`, `traceObservationWorkflow()` in telemetry-billing.ts must
 * refuse to record any new billable trace.  This ensures that no revenue
 * is collected while the system is in an unsafe state — a strict
 * requirement of Art. 9 (risk management).
 */
let _billingHalted = false;

/** A description of WHY billing was halted (shown in Incident details). */
let _haltReason = '';

/** Timestamp of the most recent halt event. */
let _haltedAt: string | null = null;

/** Returns `true` when the billing pipeline is circuit-broken. */
export function isBillingHalted(): boolean {
    return _billingHalted;
}

/** Returns context about the current halt (empty when billing is active). */
export function getHaltContext(): { halted: boolean; reason: string; haltedAt: string | null } {
    return { halted: _billingHalted, reason: _haltReason, haltedAt: _haltedAt };
}

/**
 * Halt the billing pipeline.
 * Called by the Incident Commander when a safety violation is detected.
 */
export function haltBilling(reason: string): void {
    _billingHalted = true;
    _haltReason = reason;
    _haltedAt = new Date().toISOString();
    log.warn('BILLING HALTED — circuit-breaker tripped', { reason });
}

/**
 * Resume the billing pipeline after human review.
 * Only intended to be called after a surgeon / on-call engineer confirms
 * the robot is in a safe state (Art. 14 — human oversight).
 */
export function resumeBilling(): void {
    log.info('Billing resumed — circuit-breaker reset', { previousReason: _haltReason });
    _billingHalted = false;
    _haltReason = '';
    _haltedAt = null;
}

// ─── Event Bus for Incidents & Alerts ────────────────────────────────────────

type IncidentListener = (incident: Incident) => void;
type AlertListener = (alert: AnomalyAlert) => void;

const _incidentListeners: Set<IncidentListener> = new Set();
const _alertListeners: Set<AlertListener> = new Set();

/** Subscribe to new incidents created by the Incident Commander. */
export function onIncidentCreated(listener: IncidentListener): () => void {
    _incidentListeners.add(listener);
    return () => { _incidentListeners.delete(listener); };
}

/** Subscribe to new safety alerts created by the Incident Commander. */
export function onSafetyAlert(listener: AlertListener): () => void {
    _alertListeners.add(listener);
    return () => { _alertListeners.delete(listener); };
}

function notifyIncident(incident: Incident): void {
    for (const fn of _incidentListeners) {
        try { fn(incident); } catch { /* listener errors must not crash the safety pipeline */ }
    }
}

function notifyAlert(alert: AnomalyAlert): void {
    for (const fn of _alertListeners) {
        try { fn(alert); } catch { /* listener errors must not crash the safety pipeline */ }
    }
}

// ─── Slack Webhook Payload ───────────────────────────────────────────────────

export interface SlackRemediationPayload {
    channel: string;
    username: string;
    icon_emoji: string;
    blocks: SlackBlock[];
}

interface SlackBlock {
    type: string;
    text?: { type: string; text: string; emoji?: boolean };
    fields?: { type: string; text: string }[];
    elements?: { type: string; text: string }[];
}

/**
 * Formats a structured remediation plan for a Slack Incoming Webhook.
 *
 * The payload follows the Slack Block Kit format so it renders nicely in
 * #aegis-incidents.  The remediation steps are numbered and include a
 * human-oversight call-to-action (Art. 14).
 */
export function formatSlackRemediation(incident: Incident): SlackRemediationPayload {
    const severityEmoji: Record<Incident['severity'], string> = {
        critical: ':rotating_light:',
        major: ':warning:',
        minor: ':information_source:',
        informational: ':memo:',
    };

    const remediationText = incident.remediationSteps
        .map((step, i) => `${i + 1}. ${step}`)
        .join('\n');

    return {
        channel: incident.slackChannelId ?? '#aegis-incidents',
        username: 'Aegis Incident Commander',
        icon_emoji: ':shield:',
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `${severityEmoji[incident.severity]} ${incident.title}`,
                    emoji: true,
                },
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: incident.description },
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*Severity:*\n${incident.severity.toUpperCase()}` },
                    { type: 'mrkdwn', text: `*Status:*\n${incident.status}` },
                    { type: 'mrkdwn', text: `*Source:*\n${incident.source}` },
                    { type: 'mrkdwn', text: `*Detected:*\n${incident.detectedAt}` },
                ],
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*Remediation Plan:*\n${remediationText}` },
            },
            {
                type: 'context',
                elements: [
                    { type: 'mrkdwn', text: ':eu: EU AI Act Art. 9, Art. 14 · DORA Art. 19 — Billing halted pending human review' },
                ],
            },
        ],
    };
}

// ─── Incident & Alert Factories ──────────────────────────────────────────────

let _incidentSeq = 100;
let _alertSeq = 1000;

function createLatencyIncident(frame: KinematicFrame, latencyMs: number): Incident {
    _incidentSeq++;
    const id = `inc-cmd-${_incidentSeq}`;
    return {
        id,
        title: `Kinematic Latency Breach — ${latencyMs.toFixed(0)} ms (limit ${LATENCY_THRESHOLD_MS} ms)`,
        severity: latencyMs > LATENCY_THRESHOLD_MS * 2 ? 'critical' : 'major',
        status: 'open',
        source: 'api-latency',
        description:
            `Frame ${frame.frameId} (device ${frame.deviceId}) arrived with ${latencyMs.toFixed(0)} ms latency, ` +
            `exceeding the ${LATENCY_THRESHOLD_MS} ms safety threshold. ` +
            `Billing pipeline has been automatically halted per EU AI Act Art. 9.`,
        detectedAt: new Date().toISOString(),
        assignee: undefined,
        remediationSteps: [
            'Billing pipeline halted — no new charges will be recorded',
            `Kinematic frame ${frame.frameId} snapshot captured for audit`,
            'Investigate network / simulation performance degradation',
            'Call resumeBilling() after surgeon confirms safe state (Art. 14)',
            'Post-incident review: update SLA thresholds if needed',
        ],
        relatedAlerts: [`alert-cmd-${_alertSeq}`],
        impactAssessment: `Billing suspended. Latency: ${latencyMs.toFixed(0)} ms vs ${LATENCY_THRESHOLD_MS} ms limit.`,
        slackChannelId: '#aegis-incidents',
    };
}

function createAnomalyIncident(frame: KinematicFrame): Incident {
    _incidentSeq++;
    const id = `inc-cmd-${_incidentSeq}`;
    return {
        id,
        title: `Kinematic Anomaly Detected — Score ${frame.anomalyScore.toFixed(2)} (Frame ${frame.frameId})`,
        severity: frame.anomalyScore > 0.9 ? 'critical' : 'major',
        status: 'open',
        source: 'kinematic-anomaly',
        description:
            `Device ${frame.deviceId} frame ${frame.frameId} flagged as anomalous ` +
            `(score ${frame.anomalyScore.toFixed(3)}, threshold ${ANOMALY_SCORE_THRESHOLD}). ` +
            `The billing pipeline has been automatically halted per EU AI Act Art. 9.`,
        detectedAt: new Date().toISOString(),
        assignee: undefined,
        remediationSteps: [
            'Billing pipeline halted — no new charges will be recorded',
            'Robotic arm emergency stop engaged (if not already)',
            `Anomaly score: ${frame.anomalyScore.toFixed(3)} — investigate root cause`,
            'DeepSeek-R1 root cause analysis initiated on Crusoe',
            'Awaiting surgeon confirmation before resuming (Art. 14)',
            'Post-incident review: add anomaly pattern to training data',
        ],
        relatedAlerts: [`alert-cmd-${_alertSeq}`],
        impactAssessment: 'Patient safety prioritised — billing suspended until human review.',
        slackChannelId: '#aegis-incidents',
    };
}

function createStaleTelemetryIncident(frame: KinematicFrame): Incident {
    _incidentSeq++;
    const id = `inc-cmd-${_incidentSeq}`;
    return {
        id,
        title: `Stale Telemetry Detected — Frame ${frame.frameId}`,
        severity: 'major',
        status: 'open',
        source: 'system-error',
        description:
            `Device ${frame.deviceId} frame ${frame.frameId} is stale ` +
            `(no updates for over ${STALE_TELEMETRY_THRESHOLD_MS}ms). ` +
            `The billing pipeline has been automatically halted per EU AI Act Art. 9.`,
        detectedAt: new Date().toISOString(),
        assignee: undefined,
        remediationSteps: [
            'Billing pipeline halted — no new charges will be recorded',
            'Check telemetry connection and Webots controller status',
            'Verify Supabase Realtime subscription is active',
            'Resume normal operations when telemetry stream restored',
            'Post-incident review: check network connectivity',
        ],
        relatedAlerts: [`alert-cmd-${_alertSeq}`],
        impactAssessment: 'Patient safety prioritised — billing suspended until telemetry restored.',
        slackChannelId: '#aegis-incidents',
    };
}

function createSafetyAlert(
    kind: 'latency' | 'anomaly' | 'stale',
    frame: KinematicFrame,
    detail: string,
): AnomalyAlert {
    _alertSeq++;
    return {
        id: `alert-cmd-${_alertSeq}`,
        severity: 'critical',
        title: kind === 'latency'
            ? 'Kinematic Latency Breach — Billing Halted'
            : 'Kinematic Anomaly — Billing Halted',
        message: detail,
        metric: kind === 'latency' ? 'kinematic-latency-ms' : 'anomaly-score',
        currentValue: kind === 'latency'
            ? 0 // will be overridden by caller
            : frame.anomalyScore,
        threshold: kind === 'latency' ? LATENCY_THRESHOLD_MS : ANOMALY_SCORE_THRESHOLD,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        source: 'telemetry',
    };
}

// ─── Incident Commander ──────────────────────────────────────────────────────

export interface IncidentCommanderResult {
    /** Whether the commander took action on this frame */
    triggered: boolean;
    /** The incident record (if created) */
    incident: Incident | null;
    /** The alert record (if created) */
    alert: AnomalyAlert | null;
    /** Slack payload (if created) */
    slackPayload: SlackRemediationPayload | null;
    /** Reason for triggering (empty string if not triggered) */
    reason: string;
}

/**
 * Evaluates a single kinematic frame for safety violations.
 *
 * This is the core function of the Incident Commander agent.
 * It should be called on every kinematic frame tick.
 *
 * @param frame         The latest KinematicFrame from the telemetry stream
 * @param prevTimestamp  ISO-8601 timestamp of the previous frame (for latency calc)
 * @returns Result indicating whether the commander intervened
 */
export function evaluateFrame(
    frame: KinematicFrame,
    prevTimestamp: string | null,
): IncidentCommanderResult {
    const noAction: IncidentCommanderResult = {
        triggered: false,
        incident: null,
        alert: null,
        slackPayload: null,
        reason: '',
    };

    // ── Check 1: Kinematic latency ─────────────────────────────────────────
    if (prevTimestamp) {
        const latencyMs = new Date(frame.timestamp).getTime() - new Date(prevTimestamp).getTime();

        if (latencyMs > LATENCY_THRESHOLD_MS) {
            const reason = `Kinematic latency ${latencyMs}ms exceeds ${LATENCY_THRESHOLD_MS}ms threshold`;
            haltBilling(reason);

            const incident = createLatencyIncident(frame, latencyMs);
            const alert = createSafetyAlert('latency', frame, reason);
            alert.currentValue = latencyMs;
            const slackPayload = formatSlackRemediation(incident);

            notifyIncident(incident);
            notifyAlert(alert);

            log.error('INCIDENT COMMANDER: Latency breach', {
                frameId: frame.frameId,
                latencyMs,
                incidentId: incident.id,
            });

            return { triggered: true, incident, alert, slackPayload, reason };
        }
    }

    // ── Check 2: Anomaly detection ─────────────────────────────────────────
    if (frame.isAnomalous || frame.anomalyScore > ANOMALY_SCORE_THRESHOLD) {
        const reason = `Anomaly detected — score ${frame.anomalyScore.toFixed(3)} on frame ${frame.frameId}`;
        haltBilling(reason);

        const incident = createAnomalyIncident(frame);
        const alert = createSafetyAlert('anomaly', frame, reason);
        const slackPayload = formatSlackRemediation(incident);

        notifyIncident(incident);
        notifyAlert(alert);

        log.error('INCIDENT COMMANDER: Anomaly detected', {
            frameId: frame.frameId,
            anomalyScore: frame.anomalyScore,
            incidentId: incident.id,
        });

        return { triggered: true, incident, alert, slackPayload, reason };
    }

    // ── Check 3: Stale telemetry ────────────────────────────────────────────
    const now = new Date().getTime();
    const frameTimestamp = new Date(frame.timestamp).getTime();

    if (now - frameTimestamp > STALE_TELEMETRY_THRESHOLD_MS) {
        const reason = `Telemetry stale — no updates for ${now - frameTimestamp}ms`;
        haltBilling(reason);

        const incident = createStaleTelemetryIncident(frame);
        const alert = createSafetyAlert('stale', frame, reason);
        const slackPayload = formatSlackRemediation(incident);

        notifyIncident(incident);
        notifyAlert(alert);

        log.error('INCIDENT COMMANDER: Stale telemetry detected', {
            frameId: frame.frameId,
            incidentId: incident.id,
        });

        return { triggered: true, incident, alert, slackPayload, reason };
    }

    return noAction;
}

// ─── Logger ──────────────────────────────────────────────────────────────────

const log = logger.withContext('IncidentCommander');

// ─── Reset (for tests) ──────────────────────────────────────────────────────

/** Resets all internal state — intended for unit tests only. */
export function _resetForTesting(): void {
    _billingHalted = false;
    _haltReason = '';
    _haltedAt = null;
    _incidentSeq = 100;
    _alertSeq = 1000;
    _incidentListeners.clear();
    _alertListeners.clear();
}
