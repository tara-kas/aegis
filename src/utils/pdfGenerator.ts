/**
 * PDF Generator — Clinical Dictation Report
 *
 * Generates a formatted PDF document for each Voice Scribe observation,
 * containing the FHIR observation summary, original transcript, and
 * Paid.ai billing trace information.
 *
 * Uses jsPDF for client-side PDF generation — no server round-trip.
 */

import { jsPDF } from 'jspdf';

/**
 * Generates and downloads a clinical note PDF.
 *
 * @param transcript    — Raw dictation text from the voice model
 * @param computedValue — Extracted vital / Gemini insight summary
 * @param traceId       — Paid.ai billing trace identifier
 */
export function generateClinicalNotePDF(
    transcript: string,
    computedValue: string,
    traceId: string,
): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const usableWidth = pageWidth - margin * 2;
    let y = margin;

    // ── Header ─────────────────────────────────────────────────────────────
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Aegis Clinical Dictation', margin, y);
    y += 8;

    // ── Subheader ──────────────────────────────────────────────────────────
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 12;

    // Reset text colour
    doc.setTextColor(0, 0, 0);

    // ── Section 1: Observation Summary ─────────────────────────────────────
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Observation Summary', margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('FHIR Code: Clinical Note (Voice Scribe)', margin, y);
    y += 7;

    const valueLines = doc.splitTextToSize(`Computed Value: ${computedValue}`, usableWidth);
    doc.text(valueLines, margin, y);
    y += valueLines.length * 6 + 8;

    // ── Section 2: Original Transcript ─────────────────────────────────────
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Original Transcript', margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const transcriptLines = doc.splitTextToSize(`"${transcript}"`, usableWidth);
    doc.text(transcriptLines, margin, y);
    y += transcriptLines.length * 6 + 8;

    // ── Footer ─────────────────────────────────────────────────────────────
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
        `Billing Trace ID: ${traceId} | Billed: €125.00 via Paid.ai`,
        margin,
        footerY,
    );

    // ── Save ───────────────────────────────────────────────────────────────
    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`clinical-note-${dateStr}.pdf`);
}
