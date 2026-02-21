"""
Single source of truth for all environment variables and runtime flags.
Everything else imports from here.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
# Look for .env in the aegis-core directory
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

# Crusoe Cloud configuration
CRUSOE_API_KEY = os.getenv("CRUSOE_API_KEY", "")
CRUSOE_BASE_URL = os.getenv("CRUSOE_BASE_URL", "https://api.crusoe.ai/v1")
CRUSOE_MODEL = os.getenv("CRUSOE_MODEL", "deepseek-ai/DeepSeek-R1-0528")

# Local Ollama configuration
LOCAL_BASE_URL = os.getenv("LOCAL_BASE_URL", "http://localhost:11434/v1")
LOCAL_MODEL = os.getenv("LOCAL_MODEL", "mistral")

# Model routing flag - single source of truth
USE_LOCAL_MODEL = not bool(CRUSOE_API_KEY)

# Backend configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:54321")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

# Anomaly detection thresholds
ANOMALY_VELOCITY_THRESHOLD = float(os.getenv("ANOMALY_VELOCITY_THRESHOLD", "0.5"))  # rad/s
ANOMALY_POSITION_THRESHOLD = float(os.getenv("ANOMALY_POSITION_THRESHOLD", "0.02"))  # metres

# Performance parameters
TELEMETRY_INTERVAL_MS = int(os.getenv("TELEMETRY_INTERVAL_MS", "200"))
MAX_LATENCY_MS = int(os.getenv("MAX_LATENCY_MS", "200"))
REASONING_TIMEOUT_S = int(os.getenv("REASONING_TIMEOUT_S", "30"))
MAX_RESPONSE_TOKENS = int(os.getenv("MAX_RESPONSE_TOKENS", "2048"))

# Print configuration on startup
if USE_LOCAL_MODEL:
    print("[CONFIG] Running in LOCAL mode — Mistral 7B via Ollama")
else:
    print("[CONFIG] Running in PRODUCTION mode — DeepSeek-R1-0528 via Crusoe")
