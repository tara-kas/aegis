"""
Realistic test fixtures used by all tests and inject_anomaly.py.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Dict
import numpy as np


# Normal telemetry - valid payload, all velocities < 0.5 rad/s, smooth positions
NORMAL_TELEMETRY = {
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "joint_angles": [0.1, 0.2, 0.15, 0.3, 0.25, 0.2],
    "joint_velocities": [0.1, 0.2, 0.15, 0.3, 0.25, 0.2],  # All < 0.5 rad/s
    "end_effector_xyz": [0.25, 0.15, 0.35],
    "applied_forces": [1.5, 2.0, 1.8, 2.2, 1.9, 2.1],
    "anomaly_detected": False,
    "anomaly_reason": None
}

# Anomaly telemetry - joint_velocity[2] = 2.3 rad/s exceeds threshold
ANOMALY_TELEMETRY = {
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "joint_angles": [0.1, 0.2, 0.15, 0.3, 0.25, 0.2],
    "joint_velocities": [0.1, 0.2, 2.3, 0.3, 0.25, 0.2],  # Index 2 exceeds 0.5 rad/s
    "end_effector_xyz": [0.25, 0.15, 0.35],
    "applied_forces": [1.5, 2.0, 1.8, 2.2, 1.9, 2.1],
    "anomaly_detected": True,
    "anomaly_reason": "Joint 3 velocity 2.300 rad/s exceeds threshold 0.5 rad/s"
}

# Mock DICOM pixels - 512x512 numpy array simulating a chest X-ray
MOCK_DICOM_PIXELS = np.random.randint(
    low=0,
    high=4096,  # 12-bit DICOM range
    size=(512, 512),
    dtype=np.uint16
)

# Expected FHIR Observation - complete valid FHIR R4 Observation resource
EXPECTED_FHIR_OBSERVATION = {
    "resourceType": "Observation",
    "id": str(uuid.uuid4()),
    "status": "preliminary",
    "code": {
        "coding": [
            {
                "system": "http://snomed.info/sct",
                "code": "17621005",
                "display": "Normal tissue structure"
            }
        ],
        "text": "MedSigLIP classification: healthy tissue"
    },
    "valueCodeableConcept": {
        "coding": [
            {
                "system": "http://snomed.info/sct",
                "code": "17621005",
                "display": "Normal tissue structure"
            }
        ],
        "text": "healthy tissue"
    },
    "component": [
        {
            "code": {
                "coding": [
                    {
                        "system": "http://loinc.org",
                        "code": "33747-0",
                        "display": "Confidence score"
                    }
                ],
                "text": "Classification confidence"
            },
            "valueQuantity": {
                "value": 0.95,
                "unit": "1",
                "system": "http://unitsofmeasure.org",
                "code": "{score}"
            }
        }
    ],
    "effectiveDateTime": datetime.now(timezone.utc).isoformat(),
    "issued": datetime.now(timezone.utc).isoformat()
}


def generate_telemetry_sequence(n: int, inject_anomaly_at: int = -1) -> List[Dict]:
    """
    Generate a sequence of n telemetry frames with optional anomaly injection.
    
    Args:
        n: Number of frames to generate
        inject_anomaly_at: Index at which to inject anomaly (-1 for no anomaly)
        
    Returns:
        List of telemetry payload dictionaries
    """
    sequence = []
    base_angles = [0.1, 0.2, 0.15, 0.3, 0.25, 0.2]
    base_velocities = [0.1, 0.2, 0.15, 0.3, 0.25, 0.2]
    base_position = [0.25, 0.15, 0.35]
    
    for i in range(n):
        # Slight variation in each frame
        angles = [a + np.random.uniform(-0.01, 0.01) for a in base_angles]
        velocities = [v + np.random.uniform(-0.05, 0.05) for v in base_velocities]
        position = [p + np.random.uniform(-0.001, 0.001) for p in base_position]
        
        # Inject anomaly at specified index
        if i == inject_anomaly_at:
            velocities[2] = 2.3  # Exceed threshold
            anomaly_detected = True
            anomaly_reason = "Joint 3 velocity 2.300 rad/s exceeds threshold 0.5 rad/s"
        else:
            anomaly_detected = False
            anomaly_reason = None
        
        frame = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "joint_angles": angles,
            "joint_velocities": velocities,
            "end_effector_xyz": position,
            "applied_forces": [1.5, 2.0, 1.8, 2.2, 1.9, 2.1],
            "anomaly_detected": anomaly_detected,
            "anomaly_reason": anomaly_reason
        }
        
        sequence.append(frame)
    
    return sequence
