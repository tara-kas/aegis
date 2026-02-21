"""
Complete Webots Python supervisor controller for a 6-axis surgical robotic arm.
Conceptually modelled on the Da Vinci system.
"""

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


class SurgicalArmController:
    """Webots supervisor controller for 6-axis surgical robotic arm."""
    
    def __init__(self):
        self.robot = Robot()
        self.timestep = int(self.robot.getBasicTimeStep())
        
        # Initialize 6 motors
        self.motors: List[Motor] = []
        for i in range(1, 7):
            motor = self.robot.getDevice(f"motor_{i}")
            if motor:
                motor.setPosition(float('inf'))
                motor.setVelocity(0.0)
                self.motors.append(motor)
            else:
                raise RuntimeError(f"Failed to initialize motor_{i}")
        
        # Initialize 6 position sensors
        self.position_sensors: List[PositionSensor] = []
        for i in range(1, 7):
            sensor = self.robot.getDevice(f"position_sensor_{i}")
            if sensor:
                sensor.enable(32)  # Enable at 32ms timestep
                self.position_sensors.append(sensor)
            else:
                raise RuntimeError(f"Failed to initialize position_sensor_{i}")
        
        # Previous end effector position for anomaly detection
        self.previous_end_effector_xyz: Optional[List[float]] = None
        
        # Log file path
        self.log_file = "logs/telemetry.jsonl"
        
    def forward_kinematics(self, joint_angles: List[float]) -> List[float]:
        """
        Compute end effector position from joint angles using forward kinematics.
        
        TODO: Replace with actual Denavit-Hartenberg (DH) parameters for your robot.
        This is a stub implementation that approximates a 6-DOF arm.
        
        For a real implementation, you would:
        1. Define DH parameters (a, d, alpha, theta) for each joint
        2. Compute transformation matrices T_i for each link
        3. Multiply: T_0_6 = T_0_1 * T_1_2 * T_2_3 * T_3_4 * T_4_5 * T_5_6
        4. Extract position from the last column of T_0_6
        
        Example DH parameters structure (replace with actual values):
        - Link 1: a=0.1, d=0.2, alpha=pi/2, theta=joint_angles[0]
        - Link 2: a=0.3, d=0.0, alpha=0, theta=joint_angles[1]
        - ... (continue for all 6 links)
        """
        # Stub implementation: simple approximation
        # In production, replace with actual DH parameter calculations
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
        # Check velocity threshold
        for i, velocity in enumerate(joint_velocities):
            if abs(velocity) > ANOMALY_VELOCITY_THRESHOLD:
                return True, f"Joint {i+1} velocity {velocity:.3f} rad/s exceeds threshold {ANOMALY_VELOCITY_THRESHOLD} rad/s"
        
        # Check position deviation
        if self.previous_end_effector_xyz is not None:
            for i, (current, previous) in enumerate(zip(end_effector_xyz, self.previous_end_effector_xyz)):
                deviation = abs(current - previous)
                if deviation > ANOMALY_POSITION_THRESHOLD:
                    axis_name = ["X", "Y", "Z"][i]
                    return True, f"End effector {axis_name} axis deviation {deviation:.4f} m exceeds threshold {ANOMALY_POSITION_THRESHOLD} m"
        
        return False, None
    
    def collect_telemetry(self) -> Dict:
        """Collect telemetry data from all sensors."""
        # Read joint angles from position sensors
        joint_angles = [sensor.getValue() for sensor in self.position_sensors]
        
        # Compute joint velocities (approximate as difference from previous)
        # In production, use velocity sensors if available
        joint_velocities = [0.0] * 6  # Placeholder - would use velocity sensors
        
        # Compute end effector position via forward kinematics
        end_effector_xyz = self.forward_kinematics(joint_angles)
        
        # Applied forces (placeholder - would use force/torque sensors)
        applied_forces = [0.0] * 6
        
        # Anomaly detection
        anomaly_detected, anomaly_reason = self.detect_anomalies(
            joint_velocities,
            end_effector_xyz
        )
        
        # Update previous position
        self.previous_end_effector_xyz = end_effector_xyz.copy()
        
        # Build payload
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
        """
        POST telemetry to backend with retry logic.
        
        Returns:
            True if successful, False otherwise
        """
        url = f"{BACKEND_URL}/functions/v1/telemetry-ingest"
        
        for attempt in range(3):
            try:
                response = httpx.post(
                    url,
                    json=payload,
                    timeout=5.0
                )
                response.raise_for_status()
                return True
            except Exception as e:
                if attempt < 2:
                    time.sleep(0.5)  # Wait 500ms before retry
                    continue
                else:
                    print(f"[ERROR] Failed to send telemetry after 3 attempts: {e}")
                    return False
        
        return False
    
    def log_telemetry(self, payload: Dict):
        """Append telemetry payload to logs/telemetry.jsonl."""
        try:
            with open(self.log_file, "a") as f:
                f.write(json.dumps(payload) + "\n")
        except Exception as e:
            print(f"[ERROR] Failed to write telemetry log: {e}")
    
    def run(self):
        """Main control loop."""
        print("[CONTROLLER] Surgical arm controller started")
        
        while self.robot.step(self.timestep) != -1:
            # Collect telemetry at specified interval
            current_time = time.time() * 1000  # Convert to milliseconds
            if not hasattr(self, 'last_telemetry_time'):
                self.last_telemetry_time = current_time
            
            if current_time - self.last_telemetry_time >= TELEMETRY_INTERVAL_MS:
                payload = self.collect_telemetry()
                
                # Send to backend
                success = self.send_telemetry(payload)
                
                # Log regardless of send success
                self.log_telemetry(payload)
                
                self.last_telemetry_time = current_time


if __name__ == "__main__":
    controller = SurgicalArmController()
    controller.run()
