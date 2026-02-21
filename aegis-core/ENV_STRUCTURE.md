# .env.example Structure Validation

## Required Environment Variables

Based on `config.py`, the `.env.example` file should contain the following 14 variables:

### Crusoe Cloud Configuration (3 variables)
1. `CRUSOE_API_KEY` - Leave blank for local mode, set to API key for production
2. `CRUSOE_BASE_URL` - Default: `https://api.crusoe.ai/v1`
3. `CRUSOE_MODEL` - Default: `deepseek-ai/DeepSeek-R1-0528`

### Local Ollama Configuration (2 variables)
4. `LOCAL_BASE_URL` - Default: `http://localhost:11434/v1`
5. `LOCAL_MODEL` - Default: `mistral`

### Backend Configuration (3 variables)
6. `BACKEND_URL` - Default: `http://localhost:54321`
7. `SUPABASE_URL` - Your Supabase project URL
8. `SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Anomaly Detection Thresholds (2 variables)
9. `ANOMALY_VELOCITY_THRESHOLD` - Default: `0.5` (float, rad/s)
10. `ANOMALY_POSITION_THRESHOLD` - Default: `0.02` (float, metres)

### Performance Parameters (4 variables)
11. `TELEMETRY_INTERVAL_MS` - Default: `200` (int, milliseconds)
12. `MAX_LATENCY_MS` - Default: `200` (int, milliseconds)
13. `REASONING_TIMEOUT_S` - Default: `30` (int, seconds)
14. `MAX_RESPONSE_TOKENS` - Default: `2048` (int, tokens)

## Correct .env.example Format

```bash
# Crusoe Cloud API Configuration
CRUSOE_API_KEY=
CRUSOE_BASE_URL=https://api.crusoe.ai/v1
CRUSOE_MODEL=deepseek-ai/DeepSeek-R1-0528

# Local Ollama Configuration
LOCAL_BASE_URL=http://localhost:11434/v1
LOCAL_MODEL=mistral

# Backend Configuration
BACKEND_URL=http://localhost:54321
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Anomaly Detection Thresholds
ANOMALY_VELOCITY_THRESHOLD=0.5
ANOMALY_POSITION_THRESHOLD=0.02

# Performance Parameters
TELEMETRY_INTERVAL_MS=200
MAX_LATENCY_MS=200
REASONING_TIMEOUT_S=30
MAX_RESPONSE_TOKENS=2048
```

## Validation Checklist

- [ ] File exists at `aegis-core/.env.example`
- [ ] All 14 variables are present
- [ ] Numeric values are correctly formatted (no quotes for numbers)
- [ ] String values can be empty (for optional vars like CRUSOE_API_KEY)
- [ ] Comments explain each variable's purpose
- [ ] Default values match config.py defaults

## How to Validate

Run the validation script:
```bash
cd aegis-core
python3 validate_env.py
```

Or manually check:
1. Count variables: should be exactly 14
2. Check variable names match config.py exactly
3. Verify numeric defaults match config.py
4. Ensure no extra variables that aren't in config.py
