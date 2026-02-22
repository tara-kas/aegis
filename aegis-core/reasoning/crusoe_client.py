"""
LLM reasoning engine.
Mistral 7B today, DeepSeek-R1-0528 on Crusoe when the key arrives.
The swap is one env var. Nothing else changes.
"""

import json
import re
import time
from datetime import datetime, timezone
from typing import Dict, Tuple
from openai import OpenAI

from config import (
    USE_LOCAL_MODEL,
    LOCAL_BASE_URL,
    LOCAL_MODEL,
    CRUSOE_BASE_URL,
    CRUSOE_API_KEY,
    CRUSOE_MODEL,
    MAX_RESPONSE_TOKENS,
    MAX_LATENCY_MS,
    REASONING_TIMEOUT_S
)


# Required fields for response validation
REQUIRED_FIELDS = {
    "status": str,
    "anomalies": list,
    "recommended_action": str,
    "confidence": float,
    "reasoning_tokens_used": int
}

# Default values for missing fields
DEFAULTS = {
    "status": "warning",
    "anomalies": [],
    "recommended_action": "Schema field missing — review logs",
    "confidence": 0.0,
    "reasoning_tokens_used": 0
}


def get_client() -> Tuple[OpenAI, str]:
    """
    Get OpenAI-compatible client configured for local or production.
    
    Returns:
        Tuple of (OpenAI client, model name)
    """
    if USE_LOCAL_MODEL:
        return OpenAI(
            base_url=LOCAL_BASE_URL,
            api_key="ollama",
            timeout=REASONING_TIMEOUT_S
        ), LOCAL_MODEL
    else:
        return OpenAI(
            base_url=CRUSOE_BASE_URL,
            api_key=CRUSOE_API_KEY,
            timeout=REASONING_TIMEOUT_S
        ), CRUSOE_MODEL


def parse_reasoning_response(raw: str) -> Dict:
    """
    Parse LLM response, handling Mistral clean JSON and DeepSeek-R1 chain-of-thought.
    
    Mistral returns clean JSON. DeepSeek-R1 sometimes wraps its answer in
    chain-of-thought text or markdown before the JSON object. Handle all cases.
    
    Args:
        raw: Raw response string from LLM
        
    Returns:
        Parsed JSON dictionary, or safe degraded result on failure
    """
    if not raw or not raw.strip():
        raise ValueError("Empty response from LLM")
    
    # Attempt 1: direct parse — works for Mistral, works for clean R1 output
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        pass
    
    # Attempt 2: extract JSON from within R1 chain-of-thought
    # R1 pattern: "Let me analyse this... {actual json here}"
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    
    # Attempt 3: extract from markdown code block
    # R1 pattern: ```json\n{...}\n```
    match = re.search(r'```(?:json)?\s*(.*?)\s*```', raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    
    # All attempts failed — log raw response, return safe degraded result
    # Pipeline continues — incident commander will catch the warning status
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "event": "parse_failure",
        "raw_response": raw[:500]
    }
    with open("logs/reasoning.jsonl", "a") as f:
        f.write(json.dumps(log_entry) + "\n")
    
    return {
        "status": "warning",
        "anomalies": ["LLM response could not be parsed"],
        "recommended_action": "Manual review required — automatic parsing failed",
        "confidence": 0.0,
        "reasoning_tokens_used": 0
    }


def validate_response_schema(parsed: Dict) -> Dict:
    """
    Validate and sanitize response schema.
    
    After parsing, validate all required fields exist and are the correct type.
    Mistral may omit optional fields. R1 may add extra thinking fields.
    Strip anything unexpected so downstream FHIR formatting never sees unknown keys.
    
    Args:
        parsed: Parsed JSON dictionary from LLM
        
    Returns:
        Validated and sanitized dictionary with all required fields
    """
    validated = {}
    for field, expected_type in REQUIRED_FIELDS.items():
        value = parsed.get(field, DEFAULTS[field])
        try:
            validated[field] = expected_type(value)
        except (ValueError, TypeError):
            validated[field] = DEFAULTS[field]
    
    # Strip extra fields — R1 sometimes adds thinking traces
    return validated


def analyse_telemetry(telemetry: Dict) -> Dict:
    """
    Analyse telemetry data using LLM reasoning.
    
    System prompt must explicitly tell the model to return raw JSON only —
    no explanation, no markdown, no code blocks. This is critical for both
    Mistral reliability and R1 chain-of-thought suppression.
    
    Args:
        telemetry: Telemetry payload dictionary
        
    Returns:
        Analysis result with status, anomalies, recommended_action, etc.
    """
    client, model_name = get_client()
    
    system_prompt = """You are a medical AI assistant for robotic surgical monitoring.
You ONLY identify anomalies explicitly present in the provided telemetry.
You NEVER infer or hallucinate conditions not clearly evidenced.
Respond with ONLY a valid JSON object. No explanation before or after.
No markdown. No code blocks. Raw JSON only.

Required schema:
{
  'status': 'normal | warning | critical',
  'anomalies': ['string'],
  'recommended_action': 'string',
  'confidence': 0.0,
  'reasoning_tokens_used': 0
}"""
    
    user_prompt = f"""Analyse the following surgical robot telemetry data:
{json.dumps(telemetry, indent=2)}

Identify any anomalies and provide recommended action."""
    
    start_time = time.time()
    latency_ms = 0.0
    
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,  # Low for deterministic JSON from both models
            max_tokens=MAX_RESPONSE_TOKENS
        )
        
        latency_ms = (time.time() - start_time) * 1000
        
        # Extract response content
        raw_response = response.choices[0].message.content
        
        # Parse response
        parsed = parse_reasoning_response(raw_response)
        
        # Validate schema
        validated = validate_response_schema(parsed)
        
        # Log warning if latency exceeds threshold
        if latency_ms > MAX_LATENCY_MS:
            print(f"[WARNING] LLM latency {latency_ms:.1f}ms exceeds threshold {MAX_LATENCY_MS}ms")
        
    except Exception as e:
        latency_ms = (time.time() - start_time) * 1000
        print(f"[ERROR] LLM analysis failed: {e}")
        
        # Retry once
        try:
            time.sleep(1.0)
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=MAX_RESPONSE_TOKENS
            )
            raw_response = response.choices[0].message.content
            parsed = parse_reasoning_response(raw_response)
            validated = validate_response_schema(parsed)
        except Exception as retry_error:
            print(f"[ERROR] LLM retry also failed: {retry_error}")
            # Return safe default
            validated = parse_reasoning_response("")
            validated = validate_response_schema(validated)
    
    # Log structured entry
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model": model_name,
        "latency_ms": latency_ms,
        "status": validated.get("status", "unknown"),
        "anomalies_detected": len(validated.get("anomalies", [])),
        "confidence": validated.get("confidence", 0.0),
        "mode": "local" if USE_LOCAL_MODEL else "production"
    }
    
    try:
        with open("logs/reasoning.jsonl", "a") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception as e:
        print(f"[ERROR] Failed to write reasoning log: {e}")
    
    return validated


if __name__ == "__main__":
    # Test with sample telemetry
    test_telemetry = {
        "timestamp": "2024-01-01T12:00:00Z",
        "joint_angles": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
        "joint_velocities": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
        "end_effector_xyz": [0.1, 0.2, 0.3],
        "applied_forces": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        "anomaly_detected": False,
        "anomaly_reason": None
    }
    
    result = analyse_telemetry(test_telemetry)
    print(json.dumps(result, indent=2))
