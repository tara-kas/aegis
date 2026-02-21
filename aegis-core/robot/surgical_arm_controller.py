"""
Complete Webots Python supervisor controller for a 6-axis surgical robotic arm.
Conceptually modelled on the Da Vinci system.
"""
import sys
import os

sys.path.append('/Users/tarak/Documents/GitHub/aegis/aegis-core')

import json
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional
import httpx
import math

from controller import Robot, Motor, PositionSensor

from config import (
    BACKEND_URL,
    ANOMALY_VELOCITY_THRESHOLD,
    ANOMALY_POSITION_THRESHOLD,
    TELEMETRY_INTERVAL_MS
)

# UR5e actual joint names — must match exactly what Webots has in the proto
MOTOR_NAMES = [
    "shoulder_pan_joint",
    "shoulder_lift_joint",
    "elbow_joint",
    "wrist_1_joint",
    "wrist_2_joint",
    "wrist_3_joint"
]

SENSOR_NAMES = [
    "shoulder_pan_joint_sensor",
    "shoulder_lift_joint_sensor",
    "elbow_joint_sensor",
    "wrist_1_joint_sensor",
    "wrist_2_joint_sensor",
    "wrist_3_joint_sensor"
]


class SurgicalArmController:
    """Webots supervisor controller for 6-axis surgical robotic arm."""

    def __init__(self):
        self.robot = Robot()
        self.timestep = int(self.robot.getBasicTimeStep())

        # Initialize 6 motors using UR5e joint names
        self.motors: List[Motor] = []
        for name in MOTOR_NAMES:
            motor = self.robot.getDevice(name)
            if motor:
                motor.setPosition(float('inf'))
                motor.setVelocity(0.5)  # gentle default velocity
                self.motors.append(motor)
            else:
                raise RuntimeError(f"Failed to initialize motor: {name}. Check joint name matches Webots proto.")

        # Initialize 6 position sensors using UR5e sensor names
        self.position_sensors: List[PositionSensor] = []
        for name in SENSOR_NAMES:
            sensor = self.robot.getDevice(name)
            if sensor:
                sensor.enable(32)  # Enable at 32ms timestep
                self.position_sensors.append(sensor)
            else:
                raise RuntimeError(f"Failed to initialize sensor: {name}. Check sensor name matches Webots proto.")

        # Previous end effector position for anomaly detection
        self.previous_end_effector_xyz: Optional[List[float]] = None

        # Log file path
        self.log_file = "logs/telemetry.jsonl"

        # Simulation time tracker
        self.t = 0.0

        print("[CONTROLLER] UR5e motors and sensors initialised successfully")

    def move_arm(self):
        """
        Drive the UR5e through a gentle oscillating surgical motion.
        Gives visual movement in the Webots viewport during demo.
        """
        self.t += self.timestep / 1000.0

        target_positions = [
            0.5 * math.sin(0.5 * self.t),         # shoulder pan
            -0.3 + 0.2 * math.sin(0.3 * self.t),  # shoulder lift
            0.4 * math.sin(0.4 * self.t),          # elbow
            0.3 * math.sin(0.6 * self.t),          # wrist 1
            0.2 * math.sin(0.5 * self.t),          # wrist 2
            0.1 * math.sin(0.7 * self.t)           # wrist 3
        ]

        for motor, pos in zip(self.motors, target_positions):
            motor.setPosition(pos)

    def forward_kinematics(self, joint_angles: List[float]) -> List[float]:
        """
        Compute end effector position from joint angles using forward kinematics.

        TODO: Replace with actual Denavit-Hartenberg (DH) parameters for UR5e.
        This is a stub implementation that approximates a 6-DOF arm.

        For a real implementation:
        1. Define DH parameters (a, d, alpha, theta) for each joint
        2. Compute transformation matrices T_i for each link
        3. Multiply: T_0_6 = T_0_1 * T_1_2 * T_2_3 * T_3_4 * T_4_5 * T_5_6
        4. Extract position from the last column of T_0_6

        UR5e DH parameters (approximate, replace with exact values):
        - Link 1: a=0.000, d=0.1625, alpha=pi/2
        - Link 2: a=-0.425, d=0.000, alpha=0
        - Link 3: a=-0.3922, d=0.000, alpha=0
        - Link 4: a=0.000, d=0.1333, alpha=pi/2
        - Link 5: a=0.000, d=0.0997, alpha=-pi/2
        - Link 6: a=0.000, d=0.0996, alpha=0
        """
        x = 0.3 * math.cos(joint_angles[0]) * math.cos(joint_angles[1])
        y = 0.3 * math.sin(joint_angles[0]) * math.cos(joint_angles[1])
        z = 0.3 * math.sin(joint_angles[1]) + 0.2

        return [x, y, z]

    def detect_anomalies(
        self,
        joint_velocities: List[float],
        end_effector_xyz: List[float]
    ) -> tuple[bool, Optional[str]]:
        """
        Run local anomaly detection before sending telemetry.

        Returns:
            (anomaly_detected: bool, anomaly_reason: str or None)
        """
        for i, velocity in enumerate(joint_velocities):
            if abs(velocity) > ANOMALY_VELOCITY_THRESHOLD:
                return True, (
                    f"{MOTOR_NAMES[i]} velocity {velocity:.3f} rad/s "
                    f"exceeds threshold {ANOMALY_VELOCITY_THRESHOLD} rad/s"
                )

        if self.previous_end_effector_xyz is not None:
            for i, (current, previous) in enumerate(zip(end_effector_xyz, self.previous_end_effector_xyz)):
                deviation = abs(current - previous)
                if deviation > ANOMALY_POSITION_THRESHOLD:
                    axis_name = ["X", "Y", "Z"][i]
                    return True, (
                        f"End effector {axis_name} deviation {deviation:.4f} m "
                        f"exceeds threshold {ANOMALY_POSITION_THRESHOLD} m"
                    )

        return False, None

    def collect_telemetry(self) -> Dict:
        """Collect telemetry data from all sensors."""
        joint_angles = [sensor.getValue() for sensor in self.position_sensors]
        joint_velocities = [0.0] * 6  # placeholder — use velocity sensors in production
        end_effector_xyz = self.forward_kinematics(joint_angles)
        applied_forces = [0.0] * 6   # placeholder — use force/torque sensors in production

        anomaly_detected, anomaly_reason = self.detect_anomalies(
            joint_velocities,
            end_effector_xyz
        )

        self.previous_end_effector_xyz = end_effector_xyz.copy()

        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "joint_angles": joint_angles,
            "joint_velocities": joint_velocities,
            "end_effector_xyz": end_effector_xyz,
            "applied_forces": applied_forces,
            "anomaly_detected": anomaly_detected,
            "anomaly_reason": anomaly_reason
        }

        return payload

    def send_telemetry(self, payload: Dict) -> bool:
        url = f"{BACKEND_URL}/functions/v1/telemetry-ingest"
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {os.getenv('SUPABASE_ANON_KEY')}",
            "apikey": os.getenv("SUPABASE_ANON_KEY")
        }
        
        for attempt in range(3):
            try:
                response = httpx.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=5.0
                )
                response.raise_for_status()
                return True
            except Exception as e:
                if attempt < 2:
                    time.sleep(0.5)
                    continue
                else:
                    print(f"[ERROR] Failed to send telemetry after 3 attempts: {e}")
                    return False
        
        return False

    def log_telemetry(self, payload: Dict):
        """Append telemetry payload to logs/telemetry.jsonl."""
        try:
            os.makedirs(os.path.dirname(self.log_file), exist_ok=True)
            with open(self.log_file, "a") as f:
                f.write(json.dumps(payload) + "\n")
        except Exception as e:
            print(f"[ERROR] Failed to write telemetry log: {e}")

    def run(self):
        """Main control loop."""
        print("[CONTROLLER] Surgical arm controller started — streaming telemetry")
        self.last_telemetry_time = time.time() * 1000

        while self.robot.step(self.timestep) != -1:
            # Drive arm movement every step
            self.move_arm()

            # Stream telemetry at configured interval
            current_time = time.time() * 1000
            if current_time - self.last_telemetry_time >= TELEMETRY_INTERVAL_MS:
                payload = self.collect_telemetry()
                self.send_telemetry(payload)
                self.log_telemetry(payload)
                self.last_telemetry_time = current_time


if __name__ == "__main__":
    controller = SurgicalArmController()
    controller.run()