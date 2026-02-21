"""
Runnable end-to-end test script.
Validates the full pipeline using local infrastructure only.
"""

import sys
import os
import json
import time
from datetime import datetime

# Add parent directory to path for imports
parent_dir = os.path.join(os.path.dirname(__file__), '..')
sys.path.insert(0, parent_dir)

from tests.mock_data import ANOMALY_TELEMETRY
from reasoning.crusoe_client import (
    analyse_telemetry,
    parse_reasoning_response,
    validate_response_schema
)


def test_pipeline_integration():
    """TEST 1: Pipeline integration."""
    print("\n=== TEST 1: Pipeline Integration ===")
    
    try:
        # Import ANOMALY_TELEMETRY from mock_data.py
        telemetry = ANOMALY_TELEMETRY.copy()
        
        # Call analyse_telemetry() with the anomaly payload
        response = analyse_telemetry(telemetry)
        
        # Assert response["status"] in ["warning", "critical"]
        assert response["status"] in ["warning", "critical"], \
            f"Expected status in ['warning', 'critical'], got '{response['status']}'"
        
        # Assert len(response["anomalies"]) > 0
        assert len(response["anomalies"]) > 0, \
            f"Expected at least one anomaly, got {len(response['anomalies'])}"
        
        # Assert logs/reasoning.jsonl was written to
        log_file = "logs/reasoning.jsonl"
        assert os.path.exists(log_file), f"Log file {log_file} was not created"
        
        # Verify log file has content
        with open(log_file, "r") as f:
            lines = f.readlines()
            assert len(lines) > 0, "Log file is empty"
        
        print("✓ PASS: Pipeline integration test")
        return True
        
    except AssertionError as e:
        print(f"✗ FAIL: Pipeline integration test - {e}")
        return False
    except Exception as e:
        print(f"✗ FAIL: Pipeline integration test - Unexpected error: {e}")
        return False


def test_parser_robustness():
    """TEST 2: Parser robustness (validates R1 readiness before the model swap)."""
    print("\n=== TEST 2: Parser Robustness ===")
    
    # Three payloads to test
    clean_json = '{"status": "warning", "anomalies": ["High velocity detected"], "recommended_action": "Reduce speed", "confidence": 0.85, "reasoning_tokens_used": 150}'
    
    r1_cot = '''Let me analyse this telemetry data carefully.
    The joint velocities show an anomaly at joint 3.
    {"status": "warning", "anomalies": ["High velocity detected"], "recommended_action": "Reduce speed", "confidence": 0.85, "reasoning_tokens_used": 150}
    This requires immediate attention.'''
    
    r1_markdown = '''Here's my analysis:
    ```json
    {"status": "warning", "anomalies": ["High velocity detected"], "recommended_action": "Reduce speed", "confidence": 0.85, "reasoning_tokens_used": 150}
    ```'''
    
    test_cases = [
        ("clean_json", clean_json),
        ("r1_cot", r1_cot),
        ("r1_markdown", r1_markdown)
    ]
    
    passed = 0
    failed = 0
    
    for name, raw_response in test_cases:
        try:
            # Call parse_reasoning_response()
            parsed = parse_reasoning_response(raw_response)
            
            # Then validate_response_schema()
            validated = validate_response_schema(parsed)
            
            # Assert status is one of "normal", "warning", "critical"
            assert validated["status"] in ["normal", "warning", "critical"], \
                f"Invalid status: {validated['status']}"
            
            print(f"✓ PASS: {name}")
            passed += 1
            
        except Exception as e:
            print(f"✗ FAIL: {name} - {e}")
            failed += 1
    
    print(f"\nParser robustness: {passed} passed, {failed} failed")
    return failed == 0


def test_schema_validation():
    """TEST 3: Schema validation."""
    print("\n=== TEST 3: Schema Validation ===")
    
    try:
        # Pass a response missing the "confidence" field
        incomplete_response = {
            "status": "warning",
            "anomalies": ["Test anomaly"],
            "recommended_action": "Test action"
            # Missing "confidence" and "reasoning_tokens_used"
        }
        
        # Assert validate_response_schema() returns confidence = 0.0 default without raising
        validated = validate_response_schema(incomplete_response)
        
        assert validated["confidence"] == 0.0, \
            f"Expected default confidence 0.0, got {validated['confidence']}"
        
        assert validated["reasoning_tokens_used"] == 0, \
            f"Expected default reasoning_tokens_used 0, got {validated['reasoning_tokens_used']}"
        
        assert validated["status"] == "warning", \
            f"Expected status 'warning', got {validated['status']}"
        
        print("✓ PASS: Schema validation test")
        return True
        
    except AssertionError as e:
        print(f"✗ FAIL: Schema validation test - {e}")
        return False
    except Exception as e:
        print(f"✗ FAIL: Schema validation test - Unexpected error: {e}")
        return False


def main():
    """Run all tests and print summary."""
    print("=" * 60)
    print("AEGIS Phase 3 - End-to-End Test Suite")
    print("=" * 60)
    
    start_time = time.time()
    
    # Check if Ollama is running
    try:
        import httpx
        response = httpx.get("http://localhost:11434/api/tags", timeout=2.0)
        if response.status_code == 200:
            print("[INFO] Ollama is running")
        else:
            print("[WARNING] Ollama may not be running properly")
    except Exception:
        print("[WARNING] Ollama is not running!")
        print("[INFO] Start Ollama with: ollama serve")
        print("[INFO] Then pull Mistral model with: ollama pull mistral")
        print("[INFO] Continuing tests anyway...")
    
    # Run tests
    results = []
    
    results.append(("Pipeline Integration", test_pipeline_integration()))
    results.append(("Parser Robustness", test_parser_robustness()))
    results.append(("Schema Validation", test_schema_validation()))
    
    # Calculate summary
    total_time = time.time() - start_time
    passed = sum(1 for _, result in results if result)
    failed = len(results) - passed
    
    # Determine model used
    from config import USE_LOCAL_MODEL, LOCAL_MODEL, CRUSOE_MODEL
    model_used = LOCAL_MODEL if USE_LOCAL_MODEL else CRUSOE_MODEL
    
    # Print summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Tests passed: {passed}")
    print(f"Tests failed: {failed}")
    print(f"Model used: {model_used}")
    print(f"Total runtime: {total_time:.2f}s")
    print("=" * 60)
    
    # Exit code
    if failed == 0:
        print("\n✓ ALL TESTS PASSED")
        sys.exit(0)
    else:
        print("\n✗ SOME TESTS FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
