# Aegis — Autonomous Surgical AI Agent

<p align="center">
  <strong>An autonomous AI agent that monitors robotic surgery, generates clinical documentation, manages its own infrastructure costs, and enforces EU regulatory compliance — without human intervention.</strong>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-demo">Demo</a> •
  <a href="#-testing">Testing</a> •
  <a href="#-hackathon-challenges">Challenges</a>
</p>

[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-86%2F86-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)]()
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## 💡 Why Aegis?

Surgeons in the operating theatre face an impossible multitasking burden: perform complex robotic procedures while manually documenting every clinical observation, managing device telemetry, and remaining compliant with EU AI Act regulations. Meanwhile, hospital legacy systems (SAP IS-H, i.s.h.med) are approaching end-of-life by 2030–2035, creating an urgent need for modern, interoperable data infrastructure.

**Aegis solves this.** It acts as an autonomous digital co-pilot that:

1. **Eliminates manual documentation** — Listens to the surgeon and auto-generates structured FHIR R4 clinical notes
2. **Monitors the robot in real-time** — Detects kinematic anomalies before they become dangerous
3. **Pays for its own compute** — Autonomously leases GPU resources and settles invoices via Stripe and Solana
4. **Enforces compliance by design** — Continuously audits against EU AI Act, DORA, and MDR requirements

> **Zero real patient data is used anywhere in this project.** All clinical data is synthetically generated.

---

## 🎯 What It Does

| Capability | How | Technology |
|-----------|-----|------------|
| **Listens** to the surgeon | Hallucination-free medical speech-to-text → auto-generated FHIR notes | ElevenLabs Scribe v2 |
| **Sees** pre-op imaging | Zero-shot anatomical classification on DICOM scans | Google HAI-DEF MedSigLIP |
| **Monitors** the robotic arm | 6-axis kinematic telemetry at 10 FPS, anomaly scoring | Webots simulation |
| **Reasons** clinically | 685B-parameter inference with ultra-low latency | DeepSeek-R1 on Crusoe Cloud |
| **Responds** to failures | Autonomous triage, alerting, and remediation | incident.io agents |
| **Bills** per outcome | Outcome-based billing, not per token | Paid.ai |
| **Pays** for itself | Macro-transactions + privacy-preserving micropayments | Stripe + Solana Token-2022 |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        AEGIS AGENT                               │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │  Voice       │  │  Vision      │  │  Robotic Telemetry      │ │
│  │  ElevenLabs  │  │  HAI-DEF     │  │  Webots 6-axis sim      │ │
│  │  Scribe v2   │  │  MedSigLIP   │  │  Anomaly detection      │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬─────────────┘ │
│         │                 │                      │               │
│         ▼                 ▼                      ▼               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Clinical Reasoning Engine                      │ │
│  │         DeepSeek-R1-0528 on Crusoe Cloud                    │ │
│  └──────────────────────┬──────────────────────────────────────┘ │
│                         │                                        │
│         ┌───────────────┼──────────────────┐                     │
│         ▼               ▼                  ▼                     │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐           │
│  │ FHIR R4    │  │ Financial  │  │ Compliance       │           │
│  │ Supabase   │  │ Stripe +   │  │ EU AI Act, DORA  │           │
│  │ PostgreSQL │  │ Solana     │  │ incident.io      │           │
│  └────────────┘  └────────────┘  └──────────────────┘           │
└──────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript 5.8, Tailwind CSS, React Router |
| **Backend** | Supabase (PostgreSQL + RLS + Auth + Edge Functions) |
| **Voice** | ElevenLabs Scribe v2 (medical-grade speech-to-text) |
| **Vision** | Google HAI-DEF MedSigLIP (zero-shot medical imaging) |
| **Robotics** | Webots (Da Vinci–style 6-axis surgical arm simulation) |
| **Inference** | Crusoe Cloud — DeepSeek-R1, DeepSeek-V3.1, Kimi-K2, Llama-3.3-70B |
| **Clinical Data** | HL7 FHIR R4 (Patient, Encounter, Observation, Device, Procedure) |
| **Reliability** | incident.io (SLA Guardian + Incident Commander agents) |
| **Payments** | Stripe Checkout Sessions · Solana Token-2022 · Paid.ai |
| **Governance** | Red Hat OpenShift AI (EU AI Act compliance) |

---

## 📂 Project Structure

```
aegis/
├── aegis-core/                           # 🧠 Python — Core AI & Robotics
│   ├── main.py                           #    Agent entrypoint
│   ├── config.py                         #    Environment configuration
│   ├── reasoning/                        #    LLM orchestration (Crusoe Cloud)
│   │   └── crusoe_client.py              #    DeepSeek-R1 inference client
│   ├── robot/                            #    Webots surgical arm controller
│   │   ├── surgical_arm_controller.py    #    6-axis kinematic control + anomaly detection
│   │   ├── protos/                       #    Webots proto files (PSM robot)
│   │   └── worlds/                       #    Simulation environments
│   ├── vision/                           #    Medical imaging pipeline
│   │   └── dicom_analyser.py             #    HAI-DEF MedSigLIP DICOM analysis
│   └── tests/                            #    Python test suite
│       ├── inject_anomaly.py             #    Anomaly injection for testing
│       └── mock_data.py                  #    Synthetic clinical data
│
├── src/                                  # ⚛️  TypeScript — Frontend Dashboard
│   ├── api/                              #    API clients (FHIR, Stripe, Solana, etc.)
│   ├── components/                       #    React components
│   │   ├── clinical/                     #    Vital signs, telemetry, alerts
│   │   ├── financial/                    #    Margins, transactions, charts
│   │   ├── compliance/                   #    EU AI Act checklist, audit trail
│   │   └── shared/                       #    Layout, sidebar, theme
│   ├── hooks/                            #    Custom React hooks
│   ├── types/                            #    TypeScript interfaces (FHIR, telemetry)
│   ├── mock/                             #    Synthea-style synthetic FHIR data
│   └── utils/                            #    Logging, metrics, validation
│
├── docs/                                 # 📚 Documentation
│   ├── DEPLOYMENT.md                     #    Production deployment guide
│   └── HACKATHON_DEMO.md                 #    5-minute demo script for judges
│
├── supabase/                             #    Database migrations & config
└── scripts/                              #    Dev tooling (data mode, wallet setup)
```

> **Judges:** The core AI logic lives in `aegis-core/`. The React dashboard in `src/` visualises everything in real time.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (20+ recommended)
- **Python** 3.11+ (for `aegis-core/`)
- **npm** 8+

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-org>/aegis.git
cd aegis

# ── Frontend ──
npm install

# ── Backend (Python) ──
cd aegis-core
pip install -r requirements.txt
cd ..

# ── Environment ──
cp .env.example .env
# Edit .env with your API keys (see docs/DEPLOYMENT.md for details)
```

### Run

```bash
# Start the dashboard
npm run dev
# → http://localhost:5173

# Run all tests
npm test

# Start the Python agent (requires Webots)
cd aegis-core && python main.py
```

### Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | Production build to `dist/` |
| `npm test` | Run all 86 tests once |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | Generate coverage report |
| `npm run type-check` | TypeScript type checking |
| `npm run dev:mock` | Dev server with mock data only |
| `npm run dev:live` | Dev server with live API connections |

---

## 🎬 Demo

> **5-minute walkthrough:** See [docs/HACKATHON_DEMO.md](docs/HACKATHON_DEMO.md) for the full demo script.

### Key Screens

1. **Clinical Dashboard** — Live FHIR patient data, 6-axis robotic telemetry, vital signs with threshold alerts
2. **Financial Dashboard** — Paid.ai outcome margins, Solana confidential transactions, Stripe checkout status
3. **Compliance Panel** — EU AI Act checklist (12 items), incident.io alert log, audit trail

---

## 🧪 Testing

**86/86 tests passing** · Zero TypeScript errors · Production build verified

```bash
npm test
```

| Suite | Tests | Coverage |
|-------|-------|----------|
| FHIR R4 validation | 21 | Resource schemas, search params, error handling |
| Stripe Checkout Sessions | 23 | $1,000 limit, credential protection, session lifecycle |
| Solana Token-2022 | 42 | ZK proofs, ElGamal auditor keys, HIPAA privacy (7 critical) |
| Mock data integrity | 26+ | Synthea-style synthetic FHIR resources |
| Components | — | Render tests for all dashboard panels |
| Hooks & utils | — | WebSocket reconnection, FHIR validation, metrics |

---

## 🔒 Security & Compliance

### Payment Safeguards

| Failsafe | Description | Verified By |
|----------|-------------|-------------|
| **Credential Protection** | Payment credentials (card numbers, CVVs) are NEVER included in API payloads | Automated scanning in test suite |
| **Purchase Limit** | Hard-coded $1,000 maximum for autonomous purchases | 23 Stripe tests |
| **ZK Privacy** | Solana transaction amounts encrypted via zero-knowledge proofs | 7 critical privacy tests |

### Regulatory Compliance

- **EU AI Act** — 12 compliance items: transparency (Art. 52), human oversight (Annex IV), risk management (Art. 9), data governance (Art. 10)
- **DORA** — Cybersecurity posture, incident reporting, third-party risk management
- **MDR** — Model governance, version control, bias monitoring
- **HIPAA §164.312(a)(2)(iv)** — ElGamal auditor keys ensure only authorised parties (hospital finance, FDA) can decrypt transaction amounts
- **GDPR** — Zero real PHI; all patient data is synthetically generated

---

## 🏆 Hackathon Challenges

Aegis targets the **Agentic AI Track** and **11 sponsor challenges** at HackEurope 2026:

| # | Challenge | Aegis Implementation |
|---|-----------|---------------------|
| 1 | **Agentic AI Track** (Paid.ai) | Outcome-based billing with real-time margin tracking |
| 2 | **Best AI-Powered Healthcare** (Avelios Medical) | FHIR R4 data layer replacing legacy SAP IS-H systems |
| 3 | **Best Use of Gemini** (Google DeepMind) | HAI-DEF MedSigLIP for zero-shot medical imaging |
| 4 | **Best Autonomous Consulting Agent** (BearingPoint) | Embedded compliance auditor agent |
| 5 | **Best Adaptable Agent** (incident.io) | Adaptive reliability agents with auto-remediation |
| 6 | **Best Stripe Integration** | Autonomous Checkout Sessions with security failsafes |
| 7 | **Best 'Built on Solana'** (Superteam IE) | Token-2022 confidential transfers for transaction privacy |
| 8 | **Best Use of Paid** (Paid.ai) | Telemetry trace calls for outcome-based billing |
| 9 | **Best Use of Crusoe Inference API** | DeepSeek-R1 clinical reasoning on Crusoe Cloud |
| 10 | **Best Use of ElevenLabs** | Scribe v2 hallucination-free medical transcription |
| 11 | **Best Use of Miro AI & Lovable** | Architectural context → AI-generated React frontend |
| 12 | **Best Use of OpenShift AI** (Red Hat) | Model registry and governance for EU compliance |

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [docs/HACKATHON_DEMO.md](docs/HACKATHON_DEMO.md) | 5-minute demo script for judges |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment & environment setup |
| [docs/ENV_STRUCTURE.md](docs/ENV_STRUCTURE.md) | Environment variable reference |
| [.env.example](.env.example) | Template with all required keys |

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. We welcome issues and pull requests.

---

## 📄 Licence

This project is licensed under the [MIT Licence](LICENSE).

---

<p align="center">
  Built for <strong>HackEurope 2026</strong>
</p>
