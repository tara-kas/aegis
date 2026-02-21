#!/usr/bin/env python3
"""Validate .env.example structure against config.py requirements."""

from pathlib import Path

# Expected env vars from config.py
expected_vars = {
    'CRUSOE_API_KEY': '',
    'CRUSOE_BASE_URL': 'https://api.crusoe.ai/v1',
    'CRUSOE_MODEL': 'deepseek-ai/DeepSeek-R1-0528',
    'LOCAL_BASE_URL': 'http://localhost:11434/v1',
    'LOCAL_MODEL': 'mistral',
    'BACKEND_URL': 'http://localhost:54321',
    'SUPABASE_URL': '',
    'SUPABASE_ANON_KEY': '',
    'ANOMALY_VELOCITY_THRESHOLD': '0.5',
    'ANOMALY_POSITION_THRESHOLD': '0.02',
    'TELEMETRY_INTERVAL_MS': '200',
    'MAX_LATENCY_MS': '200',
    'REASONING_TIMEOUT_S': '30',
    'MAX_RESPONSE_TOKENS': '2048'
}

def validate_env_file(filepath):
    """Validate .env file structure."""
    env_file = Path(filepath)
    
    if not env_file.exists():
        print(f'✗ {filepath} file does not exist')
        print('\nExpected variables:')
        for var, default in expected_vars.items():
            print(f'  {var}={default}')
        return False
    
    print(f'✓ {filepath} file exists')
    
    with open(env_file) as f:
        content = f.read()
        lines = [l.strip() for l in content.split('\n') if l.strip() and not l.strip().startswith('#')]
        found_vars = {}
        for line in lines:
            if '=' in line:
                key = line.split('=')[0].strip()
                value = '='.join(line.split('=')[1:]).strip()
                found_vars[key] = value
    
    print(f'Found {len(found_vars)} environment variables')
    
    # Check all expected vars are present
    missing = []
    for var in expected_vars:
        if var not in found_vars:
            missing.append(var)
    
    if missing:
        print(f'✗ Missing variables: {missing}')
        return False
    else:
        print('✓ All expected variables present')
    
    # Check for extra variables
    extra = set(found_vars.keys()) - set(expected_vars.keys())
    if extra:
        print(f'⚠ Extra variables (not in config.py): {extra}')
    else:
        print('✓ No unexpected variables')
    
    # Validate value formats
    print('\nValidating value formats:')
    errors = []
    
    # Check numeric values
    numeric_vars = {
        'ANOMALY_VELOCITY_THRESHOLD': float,
        'ANOMALY_POSITION_THRESHOLD': float,
        'TELEMETRY_INTERVAL_MS': int,
        'MAX_LATENCY_MS': int,
        'REASONING_TIMEOUT_S': int,
        'MAX_RESPONSE_TOKENS': int
    }
    
    for var, var_type in numeric_vars.items():
        if var in found_vars and found_vars[var]:
            try:
                var_type(found_vars[var])
                print(f'  ✓ {var} = {found_vars[var]} (valid {var_type.__name__})')
            except ValueError:
                errors.append(f'{var} should be {var_type.__name__}, got: {found_vars[var]}')
                print(f'  ✗ {var} = {found_vars[var]} (invalid {var_type.__name__})')
    
    if errors:
        print(f'\n✗ Validation errors: {errors}')
        return False
    
    print('\n✓ All validations passed!')
    return True

if __name__ == '__main__':
    print('=' * 60)
    print('Validating .env.example structure')
    print('=' * 60)
    
    result = validate_env_file('.env.example')
    
    print('\n' + '=' * 60)
    if result:
        print('✓ .env.example structure is CORRECT')
    else:
        print('✗ .env.example structure needs FIXING')
    print('=' * 60)
    
    exit(0 if result else 1)
