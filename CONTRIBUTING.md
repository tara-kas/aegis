# Contributing to Aegis

Thank you for your interest in contributing to Aegis! This project was originally built for **HackEurope 2026**, and we welcome contributions that improve the codebase.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork and install dependencies:
   ```bash
   git clone https://github.com/<your-username>/aegis.git
   cd aegis
   npm install
   cd aegis-core && pip install -r requirements.txt && cd ..
   ```
3. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feat/your-feature-name
   ```

## Development Workflow

```bash
# Start dev server
npm run dev

# Run tests (must pass before submitting)
npm test

# Type-check
npm run type-check
```

## Code Standards

- **TypeScript** — All frontend code must pass `tsc --noEmit` with zero errors
- **Python** — Follow PEP 8; use type hints where practical
- **Tests** — New features should include tests. Run `npm test` to verify nothing breaks
- **FHIR** — Clinical data must conform to HL7 FHIR R4 resource schemas
- **No real PHI** — All patient data must be synthetic. Never commit real health records

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add kinematic drift detection to telemetry hook
fix: correct FHIR Observation reference range validation
docs: update deployment guide for Crusoe Cloud setup
test: add Solana confidential transfer edge cases
```

## Pull Requests

1. Ensure all tests pass (`npm test`)
2. Ensure no TypeScript errors (`npm run type-check`)
3. Provide a clear description of **what** changed and **why**
4. Reference any related issues

## Reporting Issues

Open a GitHub Issue with:
- A clear title and description
- Steps to reproduce (if applicable)
- Expected vs. actual behaviour

## Licence

By contributing, you agree that your contributions will be licensed under the [MIT Licence](LICENSE).
