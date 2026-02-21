# Aegis — Autonomous AI Surgical Monitoring Agent

<<<<<<< HEAD
[![Build](https://img.shields.io/badge/build-passing-brightgreen)]() [![Tests](https://img.shields.io/badge/tests-82%2F82-brightgreen)]() [![License](https://img.shields.io/badge/license-MIT-blue)]()

Aegis is an autonomous AI surgical monitoring and clinical workflow agent designed for HackEurope 2026. It combines real-time robotic telemetry from Webots simulation, FHIR-compliant clinical data management, agentic commerce via Stripe ACP and Solana, and strict EU regulatory compliance (EU AI Act, DORA, MDR).

---

## 🎯 Project Overview

Aegis operates as a digital assistant in the operating room, providing:

- **Real-time Surgical Monitoring**: Live telemetry from Webots 6-axis robotic arm simulation with kinematic anomaly detection
- **FHIR-Compliant Data Management**: Strict HL7 FHIR R4 resources (Patient, Encounter, Observation, Device, Procedure) replacing legacy hospital databases
- **Agentic Commerce**: Autonomous financial operations via Stripe Agentic Commerce Protocol and Solana Token-2022 confidential transfers
- **Outcome-Based Billing**: Paid.ai telemetry tracking multi-vendor API costs and proving financial value
- **EU Regulatory Compliance**: EU AI Act, DORA, and MDR compliance monitoring with incident.io adaptive agents
- **Hands-Free Interface**: ElevenLabs Scribe v2 for hallucination-free medical speech-to-text

---

## 🏗️ Architecture

### Technology Stack

**Frontend**
- React 19 + TypeScript 5.7
- Tailwind CSS for styling
- React Router 7 for navigation
- Recharts for financial visualizations
- Lucide React for iconography

**Backend Services**
- Supabase (PostgreSQL + RLS + Auth + Edge Functions)
- Webots robotic simulation
- Google HAI-DEF (MedSigLIP) for medical imaging
- Crusoe Cloud for LLM inference (DeepSeek-R1, DeepSeek-V3.1, Llama-3.3-70B)
- ElevenLabs Scribe v2 for voice transcription

**Financial Infrastructure**
- Stripe Agentic Commerce Protocol (ACP)
- Solana blockchain (Token-2022 with Confidential Transfers)
- Paid.ai for outcome-based billing telemetry

**Compliance & Governance**
- Red Hat OpenShift AI for model registry
- incident.io for adaptive reliability agents

---

## 📂 Project Structure

```
aegis/
├── src/
│   ├── api/
│   │   ├── fhir.ts                      # FHIR R4 REST API client
│   │   └── supabase.ts                  # Supabase client with RLS queries
│   ├── types/
│   │   ├── telemetry.ts                 # Webots kinematic frames, vital signs
│   │   ├── financial.ts                 # Stripe ACP, Solana, Paid.ai types
│   │   └── compliance.ts                # EU AI Act, DORA, incident.io
│   ├── mock/
│   │   └── data.ts                      # Synthea-style synthetic FHIR data
│   ├── hooks/
│   │   ├── useWebSocket.ts              # Reconnecting WebSocket
│   │   ├── useTelemetry.ts              # Live vital signs + kinematic stream
│   │   └── useFhirResource.ts           # FHIR fetch hook
│   ├── utils/
│   │   ├── logger.ts                    # Structured logging + PHI audit
│   │   ├── metrics.ts                   # Counters, gauges, histograms
│   │   └── fhirValidation.ts            # R4 resource validation
│   ├── components/
│   │   ├── ClinicalDashboard.tsx        # Live telemetry + FHIR patient data
│   │   ├── FinancialDashboard.tsx       # Margins, Solana tx, Stripe ACP
│   │   ├── CompliancePanel.tsx          # EU AI Act checklist + incidents
│   │   ├── clinical/                    # Vital cards, telemetry, alerts
│   │   ├── financial/                   # Margin display, tx feed, charts
│   │   ├── compliance/                  # Checklist, audit trail, scores
│   │   └── shared/                      # Layout, Sidebar
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── dist/                                 # Production build output
├── .cursor/rules/
│   ├── tech_stack.mdc                   # Dev standards & guidelines
│   └── fhir_standards.mdc               # FHIR implementation rules
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── tailwind.config.cjs
└── README.md
```

---

## ✅ Implementation Status

### Phase 1: Frontend Foundation ✅ COMPLETE

**32 files created** | **82/82 tests passing** | **Production build successful**

#### FHIR R4 Clinical Data Layer ✅
- ✅ Typed interfaces for Patient, Encounter, Observation, Device, Procedure
- ✅ FHIR REST API client with OperationOutcome error handling
- ✅ LOINC-coded vital signs (HR, SpO₂, BP, EtCO₂, RR, Temp)
- ✅ SNOMED-coded procedures and devices
- ✅ Resource metadata (meta, versionId, lastUpdated) on all resources
- ✅ FHIR search parameter support
- ✅ Validation against FHIR R4 schema

#### Mock Data Layer ✅
- ✅ 3 synthetic patients (Synthea-style with NHS identifiers)
- ✅ 3 encounters (in-progress, planned, finished)
- ✅ 6 vital sign observations with reference ranges
- ✅ 2 devices (robotic arm, patient monitor)
- ✅ 1 active surgical procedure
- ✅ 200 kinematic frames with anomaly at frame 150
- ✅ Zero real PHI — all data synthetic

#### Real-Time Telemetry ✅
- ✅ WebSocket hook with exponential backoff reconnection
- ✅ Live vital signs stream (7 metrics) with realistic drift
- ✅ 6-axis robotic arm telemetry (joint angles, end effector position)
- ✅ Anomaly detection with severity classification (critical/warning/info)
- ✅ Connection status tracking (connected/connecting/disconnected/error)
- ✅ Kinematic frame simulation at 10 FPS

#### Clinical Dashboard ✅
- ✅ `VitalSignCard` — Individual vital with threshold colouring + trend arrows
- ✅ `TelemetryPanel` — 6-axis joint angles, end effector position, anomaly score
- ✅ `AnomalyAlertBanner` — Critical/warning/info alerts with acknowledge/dismiss
- ✅ `PatientViewer` — FHIR Patient demographics, active encounter, recent observations
- ✅ `EncounterTimeline` — Surgical encounter timeline with procedures
- ✅ Stream controls (start/stop telemetry)

#### Financial Dashboard ✅
- ✅ `MarginDisplay` — Paid.ai outcome-based billing with multi-vendor cost breakdown
- ✅ `SolanaTransactionFeed` — Token-2022 transactions with confidential transfer badges
- ✅ `StripeACPStatus` — Shared Payment Tokens (created/authorized/captured status)
- ✅ `RevenueChart` — Revenue/cost/profit area chart (24-hour data)
- ✅ Paid.ai traces with success/failure/pending outcomes
- ✅ Automatic €0 billing for failed workflows

#### Compliance Panel ✅
- ✅ `EUAIActChecklist` — 12 compliance items across EU AI Act, DORA, MDR, GDPR
- ✅ `IncidentAlertLog` — incident.io alerts with remediation steps + escalation
- ✅ `ComplianceScoreCard` — Category-level compliance scoring
- ✅ `AuditTrail` — PHI access audit log with read/create/update/delete tracking
- ✅ Article references (Art. 52, Annex IV, etc.)

#### Infrastructure ✅
- ✅ Supabase client with RLS-aware queries + PHI logging stubs
- ✅ Structured logging with context + audit trail
- ✅ Metrics collection (counters, gauges, histograms, timers)
- ✅ FHIR resource validation
- ✅ App shell with sidebar navigation (Clinical/Financial/Compliance)
- ✅ Tailwind CSS dark theme optimized for surgical environments

#### Testing ✅
- ✅ 82 unit tests across 8 test suites
- ✅ FHIR validation tests (Patient, Encounter, Observation, Device, Procedure)
- ✅ Mock data integrity tests (200+ assertions)
- ✅ Component render tests (Clinical, Financial, Compliance dashboards)
- ✅ Hook tests (useTelemetry, useWebSocket, useFhirResource)
- ✅ Utility tests (logger, metrics, validation)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (note: v18.10.0 works but shows engine warnings; Node 20+ recommended)
- npm 8+

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd aegis

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see the dashboard.

### Available Scripts

- `npm run dev` — Start Vite dev server (port 5173)
- `npm run build` — Production build to `dist/`
- `npm run preview` — Preview production build
- `npm test` — Run all tests once
- `npm run test:watch` — Run tests in watch mode
- `npm run test:coverage` — Generate coverage report
- `npm run type-check` — TypeScript type checking

---

## 🧪 Testing

All critical paths are covered by unit tests:

```bash
npm test
```

**Test Results**: 82/82 passing across 8 suites
- `src/api/__tests__/fhir.test.ts` — 21 tests
- `src/mock/__tests__/data.test.ts` — 26 tests
- `src/hooks/__tests__/useTelemetry.test.ts` — 5 tests
- `src/components/__tests__/ClinicalDashboard.test.tsx` — 6 tests
- `src/components/__tests__/FinancialDashboard.test.tsx` — 7 tests
- `src/components/__tests__/CompliancePanel.test.tsx` — 7 tests
- `src/utils/__tests__/logger.test.ts` — 5 tests
- `src/utils/__tests__/metrics.test.ts` — 5 tests

---

## 📊 Key Features

### FHIR R4 Compliance

All clinical data is typed as proper FHIR R4 resources:

```typescript
// Example: Patient resource
{
  resourceType: "Patient",
  id: "patient-001",
  meta: { versionId: "3", lastUpdated: "2026-02-21T08:00:00Z" },
  identifier: [
    { system: "urn:oid:2.16.840.1.113883.2.1.4.1", value: "NHS-9876543210" },
    { system: "urn:aegis:mrn", value: "MRN-2026-0001" }
  ],
  name: [{ family: "Nakamura", given: ["Yuki", "A."] }],
  gender: "female",
  birthDate: "1988-03-14"
}
```

### Real-Time Telemetry

Live kinematic data from Webots 6-axis robotic arm:

```typescript
// Kinematic frame structure
{
  timestamp: "2026-02-21T09:15:00Z",
  frameId: 150,
  deviceId: "robot-arm-001",
  joints: [
    { jointId: "j1", name: "base-rotation", angleDeg: 45.2, torqueNm: 2.1 },
    // ... 5 more joints
  ],
  endEffector: {
    position: { x: 200.5, y: 150.3, z: 120.1 },
    orientation: { roll: 2.1, pitch: -1.5, yaw: 180.0 },
    forceN: 1.35,
    gripperApertureMm: 8.2
  },
  isAnomalous: true,
  anomalyScore: 0.87
}
```

### Agentic Commerce

Stripe ACP Shared Payment Tokens enable autonomous equipment leasing:

```typescript
{
  id: "spt_001",
  merchantId: "merch_crusoe_cloud",
  amountCents: 100000,  // €1000
  status: "captured",
  scope: "compute:inference:deepseek-r1"
}
```

Solana Token-2022 confidential transfers maintain patient privacy:

```typescript
{
  signature: "5KtPn1LGuxhFiwjxErkxTb...",
  isConfidential: true,  // Amount obscured via ZK proof
  memo: "aegis:inference:deepseek-r1:obs-001"
}
=======
Aegis is an autonomous agent that monitors robotic surgery in real-time, eliminates manual clinical documentation, and manages its own infrastructure costs — without human intervention.

---

## What It Does

- **Listens** to the surgeon via ElevenLabs Scribe v2 (hallucination-free medical STT) and auto-generates FHIR clinical notes
- **Sees** pre-operative DICOM imaging via Google HAI-DEF MedSigLIP for zero-shot anatomical classification
- **Monitors** a simulated 6-axis surgical arm (Webots) for kinematic anomalies in real-time
- **Reasons** using DeepSeek-R1-0528 on Crusoe Cloud — ultra-low latency, 685B parameter clinical inference
- **Responds** to failures autonomously via incident.io — triages anomalies, alerts the clinical engineer, never acts blind
- **Bills** per validated clinical outcome via Paid.ai, not per token
- **Pays** for its own compute via Stripe ACP (macro) and Solana Token-2022 Confidential Transfers (micropayments)

---

## Stack

| Layer | Tech |
|---|---|
| Voice | ElevenLabs Scribe v2 |
| Vision | Google HAI-DEF MedSigLIP |
| Robotics | Webots (Da Vinci model) |
| Inference | Crusoe Cloud — DeepSeek-R1, V3.1, Kimi-K2, Qwen3, Llama-3.3 |
| Data | FHIR R4 on Supabase PostgreSQL |
| Frontend | React via Lovable + Miro MCP |
| Reliability | incident.io (SLA Guardian + Incident Commander) |
| Payments | Stripe ACP · Solana Token-2022 · Paid.ai |
| Governance | Red Hat OpenShift AI (EU AI Act · DORA · MDR) |

---

## Setup

```bash
git clone https://github.com/your-org/aegis
cd aegis
npm install && pip install -r requirements.txt
cp .env.example .env
```

```bash
# .env keys needed
CRUSOE_API_KEY · ELEVENLABS_API_KEY · SUPABASE_URL · SUPABASE_ANON_KEY
STRIPE_SECRET_KEY · STRIPE_NETWORK_ID · SOLANA_KEYPAIR_PATH
PAIDAI_API_KEY · INCIDENTIO_API_KEY
```

```bash
python robot/surgical_arm_controller.py   # start Webots sim
python reasoning/crusoe_client.py          # start inference service
python reliability/incident_commander.py   # start reliability monitor
npm run dev                                # start dashboard
>>>>>>> febaaa462d40033ecd22b4f00919bc1532ef82c9
```

---

<<<<<<< HEAD
## 🔒 Security & Compliance

### PHI Protection

- ✅ All patient data is **synthetic** (Synthea-generated)
- ✅ No real PHI committed to version control
- ✅ PHI access logging on all read/create/update/delete operations
- ✅ Supabase Row Level Security (RLS) policies documented

### Regulatory Compliance

**EU AI Act**: 12 compliance items tracked across:
- Transparency (Art. 52)
- Human oversight (Annex IV §2)
- Technical documentation (Annex VII)
- Risk management (Art. 9)
- Data governance (Art. 10)
- GPAI systemic risk obligations (Art. 55)

**DORA**: Cybersecurity, incident reporting, third-party risk management

**MDR**: Model governance, versioning, bias monitoring

---

## 🎨 UI/UX

Dark theme optimized for surgical environments:
- High contrast for critical alerts (red = critical, amber = warning, blue = info)
- Monospace fonts for numerical data (vital signs, kinematic readings)
- Real-time updating with smooth transitions
- Colour-coded thresholds (green = safe, amber = warning, red = critical)

---

## 📚 Documentation

- **Tech Stack Guide**: `.cursor/rules/tech_stack.mdc`
- **FHIR Standards**: `.cursor/rules/fhir_standards.mdc`
- **Architecture Document**: `project.txt` (291 lines)

---

## 🤝 Contributing

This is a hackathon project for HackEurope 2026. For questions or contributions, please contact the team.

---

## 📄 License

MIT License — See LICENSE file for details

---

## 🏆 Hackathon Challenges Targeted

1. **Agentic AI Track (Paid.ai)** — Outcome-based billing with real-time margin tracking
2. **Best AI-Powered Healthcare Solution (Avelios Medical)** — FHIR R4 data layer replacing legacy systems
3. **Best Use of Gemini (Google DeepMind)** — HAI-DEF MedSigLIP integration planned
4. **Best Autonomous Consulting Agent (BearingPoint)** — Embedded compliance auditor
5. **Best Adaptable Agent (incident.io)** — Adaptive reliability agents with remediation
6. **Best Stripe Integration** — Agentic Commerce Protocol with SPT
7. **Best 'Built on Solana' Project** — Token-2022 confidential transfers for privacy
8. **Best use of Paid** — Telemetry trace calls for outcome-based billing
9. **Best Use of Crusoe Inference API** — DeepSeek-R1 clinical reasoning (planned)
10. **Best Use of ElevenLabs** — Scribe v2 medical transcription (planned)
11. **Best Use of Miro AI & Lovable** — Architectural context generation (this README generated from Miro context)
12. **Best Use of OpenShift AI Platform** — Model registry and governance (planned)

---

Built with ❤️ for HackEurope 2026
=======
## Compliance

Built for the EU from day one: EU AI Act (high-risk / Annex VII), DORA, MDR, GDPR. Demo uses fully synthetic patient data (Synthea + MIMIC-IV). MedSigLIP runs locally — no PHI leaves the hospital network.

---

*Built at HackEurope 2026*
>>>>>>> febaaa462d40033ecd22b4f00919bc1532ef82c9
