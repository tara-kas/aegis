# Aegis — Autonomous AI Surgical Monitoring Agent

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
```

---

## Compliance

Built for the EU from day one: EU AI Act (high-risk / Annex VII), DORA, MDR, GDPR. Demo uses fully synthetic patient data (Synthea + MIMIC-IV). MedSigLIP runs locally — no PHI leaves the hospital network.

---

*Built at HackEurope 2026*
