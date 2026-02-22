"""
Complete Webots Python supervisor controller for a 6-axis surgical robotic arm.
Conceptually modelled on the Da Vinci system.

Surgical trajectory modes:
  1. Suturing  — small elliptical loops that mimic needle-driving and knot-tying
  2. Incision  — slow linear strokes along the Y-axis with controlled depth

Breathing compensation:
  A slow sinusoidal wave on the Z-axis (~0.25 Hz, 2 mm amplitude) simulates the
  robot actively compensating for the patient's respiratory motion.

Telemetry is POST-ed every 500 ms, including a stochastic anomaly flag that fires
~0.5 % of the time (with a 12-second cooldown) so the front-end alert pipeline
can be exercised without flooding the UI.
"""
import sys
import os

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

import json
import time
import random
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
import httpx
import math

from controller import Robot, Motor, PositionSensor

from config import (
    BACKEND_URL,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
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

# ─── Surgical trajectory constants ───────────────────────────────────────────

# How long each phase lasts (seconds of sim time) before cycling
SUTURE_PHASE_DURATION = 8.0      # one full suture loop
INCISION_PHASE_DURATION = 6.0    # one full incision stroke
RETRACT_PHASE_DURATION = 3.0      # safe position transition

# Breathing compensation: ~15 breaths/min → 0.25 Hz, ±2 mm amplitude
BREATHING_FREQ_HZ = 0.25
BREATHING_AMPLITUDE_RAD = 0.008  # maps to ~2 mm at the wrist

# Random anomaly injection probability (per telemetry tick)
RANDOM_ANOMALY_PROBABILITY = 0.005

# Cooldown: minimum seconds between any two anomaly triggers
ANOMALY_COOLDOWN_SECONDS = 30.0

# Fixed telemetry cadence for the demo (overrides env default)
TELEMETRY_SEND_INTERVAL_MS = 500

RANDOM_ANOMALY_REASONS = [
    "Unexpected force spike on wrist_3_joint — possible tissue resistance",
    "End-effector drift exceeded 1.5 mm — recalibrating",
    "Joint velocity transient on elbow_joint — vibration damping engaged",
    "Instrument tip deflection detected — adjusting trajectory",
    "Momentary communication latency >150 ms with control unit",
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
                motor.setVelocity(0.3)  # slow, precise surgical velocity
                self.motors.append(motor)
            else:
                raise RuntimeError(f"Failed to initialize motor: {name}. Check joint name matches Webots proto.")

        # Initialize 6 position sensors using UR5e sensor names
        self.position_sensors: List[PositionSensor] = []
        for name in SENSOR_NAMES:
            sensor = self.robot.getDevice(name)
            if sensor:
                sensor.enable(self.timestep)
                self.position_sensors.append(sensor)
            else:
                raise RuntimeError(f"Failed to initialize sensor: {name}. Check sensor name matches Webots proto.")

        # Previous joint angles for numeric velocity estimation
        self.prev_joint_angles: Optional[List[float]] = None

        # Previous end effector position for anomaly detection
        self.previous_end_effector_xyz: Optional[List[float]] = None

        # Anomaly cooldown tracker (sim-time of last anomaly)
        self.last_anomaly_time: float = -ANOMALY_COOLDOWN_SECONDS

        # One-shot flag: ensures anomaly_detected=True is emitted for exactly one POST
        self._anomaly_emitted = False

        # Log file path
        self.log_file = "logs/telemetry.jsonl"

        # Simulation time tracker
        self.t = 0.0

        # Surgical phase: cycles between "suture", "retract", and "incision"
        self.phase = "suture"
        self.phase_start_t = 0.0
        self.retract_start_position = None

        print("[CONTROLLER] UR5e motors and sensors initialised successfully")
        print(f"[CONTROLLER] Telemetry interval: {TELEMETRY_SEND_INTERVAL_MS} ms")
        print(f"[CONTROLLER] Random anomaly probability: {RANDOM_ANOMALY_PROBABILITY * 100:.1f}%")
        print(f"[CONTROLLER] Anomaly cooldown: {ANOMALY_COOLDOWN_SECONDS:.0f}s")

    # ─── Surgical trajectory generation ───────────────────────────────────

    def _suture_targets(self, phase_t: float) -> List[float]:
        """
        Generate joint targets for a suturing motion over patient torso.

        The toolSlot rotation in the world file means the surgical pencil
        points in the tool0 -X direction. wrist_2 = -1.5708 rotates tool0 X
        upward, making the pencil point straight down at the patient.

        phase_t: seconds elapsed within current suture phase.
        """
        theta = (phase_t / SUTURE_PHASE_DURATION) * 2.0 * math.pi

        # Shoulder pan: centered toward patient, sweeping lateral motion
        shoulder_pan  = 0.5 + 0.15 * math.sin(theta)
        # Shoulder lift + elbow sum to ~0 so forearm is horizontal
        shoulder_lift = -1.0 + 0.08 * math.sin(theta)
        elbow         = 0.8  + 0.08 * math.cos(theta)
        # wrist_1: +1.5708 rotates tool0 X upward -> pencil -X points DOWN
        # small oscillation for needle depth variation around downward position
        wrist_1       = -1.5708 + 0.20 * math.sin(2.0 * theta)
        # wrist_2: lateral blade angle during suturing
        wrist_2       = 0.15 * math.cos(theta)
        # wrist_3: knot-tying twist around pencil long axis
        wrist_3       = 0.30 * math.sin(3.0 * theta)

        return [shoulder_pan, shoulder_lift, elbow, wrist_1, wrist_2, wrist_3]

    def _incision_targets(self, phase_t: float) -> List[float]:
        """
        Generate joint targets for a linear incision stroke over patient.

        wrist_2 held at -1.5708 keeps pencil pointing straight down
        throughout the entire stroke. Shoulder pan creates the sweeping
        motion along the patient's midline.

        phase_t: seconds elapsed within current incision phase.
        """
        progress  = phase_t / INCISION_PHASE_DURATION
        triangle  = 1.0 - abs(2.0 * progress - 1.0)

        # Long sweep along incision line
        shoulder_pan  = 0.30 + 0.25 * triangle
        # Maintain consistent depth
        shoulder_lift = -1.0 + 0.03 * triangle
        # Extend slightly during stroke
        elbow         = 0.8  + 0.05 * triangle
        # wrist_1: +1.5708 keeps pencil pointing straight down throughout stroke
        wrist_1       = -1.5708
        # wrist_2: neutral during straight cut
        wrist_2       = 0.0
        # wrist_3: no twist during incision
        wrist_3       = 0.0

        return [shoulder_pan, shoulder_lift, elbow, wrist_1, wrist_2, wrist_3]

    def _breathing_compensation(self) -> List[float]:
        """
        Return per-joint offsets that simulate compensating for patient breathing.

        A slow sinusoidal wave (~0.25 Hz ≈ 15 breaths/min) is applied primarily
        to the shoulder-lift and wrist-1 joints (Z-axis compensation).
        """
        breath = math.sin(2.0 * math.pi * BREATHING_FREQ_HZ * self.t)

        return [
            0.0,                                    # shoulder pan — unaffected
            BREATHING_AMPLITUDE_RAD * breath,       # shoulder lift — primary Z comp
            -BREATHING_AMPLITUDE_RAD * 0.5 * breath,  # elbow — counter-compensate
            BREATHING_AMPLITUDE_RAD * 0.3 * breath, # wrist 1 — fine Z adjustment
            0.0,                                    # wrist 2 — unaffected
            0.0,                                    # wrist 3 — unaffected
        ]

    def _retract_targets(self, phase_t: float) -> List[float]:
        """
        Generate joint targets for smooth retraction to safe position.

        Linear interpolation from current position to neutral safe position
        over 3 second duration. Makes motion look deliberate and safe.
        """
        # Safe neutral position — pencil pointing down via wrist_1=+1.5708
        safe_position = [0.45, -0.8, 0.8, 1.5708, 0.0, 0.0]
        
        # Store starting position on first call
        if self.retract_start_position is None:
            self.retract_start_position = [sensor.getValue() for sensor in self.position_sensors]
            print(f"[TRAJECTORY] t={self.t:.1f}s — RETRACTING to safe position")
        
        # Linear interpolation over 3 seconds
        progress = min(phase_t / RETRACT_PHASE_DURATION, 1.0)
        targets = [
            start + (safe - start) * progress
            for start, safe in zip(self.retract_start_position, safe_position)
        ]
        
        return targets

    def move_arm(self):
        """
        Drive the UR5e through realistic surgical trajectories.

        Alternates between suturing and incision phases, with continuous
        breathing compensation overlaid on every motion.
        """
        dt = self.timestep / 1000.0
        self.t += dt

        # ── Phase management: cycle suture → retract → incision → retract → suture ─────────
        phase_t = self.t - self.phase_start_t

        if self.phase == "suture" and phase_t >= SUTURE_PHASE_DURATION:
            self.phase = "retract"
            self.phase_start_t = self.t
            phase_t = 0.0
            print(f"[TRAJECTORY] t={self.t:.1f}s — switching to RETRACT phase")
        elif self.phase == "retract" and phase_t >= RETRACT_PHASE_DURATION:
            self.phase = "incision"
            self.phase_start_t = self.t
            phase_t = 0.0
            self.retract_start_position = None
            print(f"[TRAJECTORY] t={self.t:.1f}s — switching to INCISION phase")
        elif self.phase == "incision" and phase_t >= INCISION_PHASE_DURATION:
            self.phase = "retract"
            self.phase_start_t = self.t
            phase_t = 0.0
            print(f"[TRAJECTORY] t={self.t:.1f}s — switching to RETRACT phase")

        # ── Compute trajectory + breathing overlay ────────────────────
        if self.phase == "suture":
            targets = self._suture_targets(phase_t)
        elif self.phase == "incision":
            targets = self._incision_targets(phase_t)
        else:  # retract phase
            targets = self._retract_targets(phase_t)

        breathing = self._breathing_compensation()
        final_targets = [t + b for t, b in zip(targets, breathing)]

        for motor, pos in zip(self.motors, final_targets):
            motor.setPosition(pos)

    def forward_kinematics(self, joint_angles: List[float]) -> List[float]:
        """
        Compute approximate end-effector position from joint angles.

        Uses simplified UR5e geometry (two-link planar approximation
        with shoulder rotation). Sufficient for demo telemetry;
        replace with full DH parameters for clinical use.

        UR5e DH parameters (reference, not fully used here):
        - Link 1: a=0.000, d=0.1625, alpha=pi/2
        - Link 2: a=-0.425, d=0.000, alpha=0
        - Link 3: a=-0.3922, d=0.000, alpha=0
        - Link 4: a=0.000, d=0.1333, alpha=pi/2
        - Link 5: a=0.000, d=0.0997, alpha=-pi/2
        - Link 6: a=0.000, d=0.0996, alpha=0
        """
        # Approximate link lengths (metres)
        L1 = 0.425   # upper arm
        L2 = 0.392   # forearm

        theta1 = joint_angles[0]  # shoulder pan  (rotation about Z)
        theta2 = joint_angles[1]  # shoulder lift (elevation)
        theta3 = joint_angles[2]  # elbow

        # Planar reach in the shoulder-lift + elbow plane
        r = L1 * math.cos(theta2) + L2 * math.cos(theta2 + theta3)
        z = L1 * math.sin(theta2) + L2 * math.sin(theta2 + theta3) + 0.1625

        # Project into XY via shoulder pan
        x = r * math.cos(theta1)
        y = r * math.sin(theta1)

        return [round(x, 6), round(y, 6), round(z, 6)]

    def _estimate_velocities(self, current_angles: List[float]) -> List[float]:
        """
        Numerically estimate joint velocities from consecutive angle readings.

        Returns rad/s for each joint. Uses zero on the first call.
        """
        if self.prev_joint_angles is None:
            return [0.0] * 6

        dt = self.timestep / 1000.0
        if dt <= 0:
            return [0.0] * 6

        velocities = [
            (curr - prev) / dt
            for curr, prev in zip(current_angles, self.prev_joint_angles)
        ]
        return [round(v, 5) for v in velocities]

    def _estimate_forces(self, joint_velocities: List[float]) -> List[float]:
        """
        Approximate applied torques from velocity (simple damping model).

        In production, read from force/torque sensors. This gives the
        telemetry realistic non-zero force values for the dashboard.
        """
        # Damping coefficient (Nm per rad/s) — tuned for visual plausibility
        DAMPING = 2.5
        return [round(abs(v) * DAMPING + random.gauss(0, 0.02), 4) for v in joint_velocities]

    def detect_anomalies(
        self,
        joint_velocities: List[float],
        end_effector_xyz: List[float]
    ) -> Tuple[bool, Optional[str]]:
        """
        Run local anomaly detection, plus a stochastic 0.5% random trigger.

        A cooldown of ANOMALY_COOLDOWN_SECONDS prevents back-to-back
        anomalies from flooding the dashboard.  The random trigger ensures
        the UI alert pipeline is exercised during every demo, regardless
        of how gentle the trajectory is.

        Returns:
            (anomaly_detected: bool, anomaly_reason: str or None)
        """
        # ── Cooldown guard: suppress if too recent ────────────────────
        if (self.t - self.last_anomaly_time) < ANOMALY_COOLDOWN_SECONDS:
            return False, None

        # 1. Physics-based: velocity threshold
        for i, velocity in enumerate(joint_velocities):
            if abs(velocity) > ANOMALY_VELOCITY_THRESHOLD:
                self.last_anomaly_time = self.t
                return True, (
                    f"{MOTOR_NAMES[i]} velocity {velocity:.3f} rad/s "
                    f"exceeds threshold {ANOMALY_VELOCITY_THRESHOLD} rad/s"
                )

        # 2. Physics-based: end-effector position deviation
        if self.previous_end_effector_xyz is not None:
            for i, (current, previous) in enumerate(zip(end_effector_xyz, self.previous_end_effector_xyz)):
                deviation = abs(current - previous)
                if deviation > ANOMALY_POSITION_THRESHOLD:
                    axis_name = ["X", "Y", "Z"][i]
                    self.last_anomaly_time = self.t
                    return True, (
                        f"End effector {axis_name} deviation {deviation:.4f} m "
                        f"exceeds threshold {ANOMALY_POSITION_THRESHOLD} m"
                    )

        # 3. Stochastic: 0.5% random anomaly for demo/testing
        if random.random() < RANDOM_ANOMALY_PROBABILITY:
            reason = random.choice(RANDOM_ANOMALY_REASONS)
            self.last_anomaly_time = self.t
            return True, reason

        return False, None

    def collect_telemetry(self) -> Dict:
        """Collect telemetry data from all sensors with velocity estimation."""
        joint_angles = [sensor.getValue() for sensor in self.position_sensors]

        # Estimate velocities numerically from consecutive readings
        joint_velocities = self._estimate_velocities(joint_angles)
        self.prev_joint_angles = joint_angles[:]

        end_effector_xyz = self.forward_kinematics(joint_angles)
        applied_forces = self._estimate_forces(joint_velocities)

        anomaly_detected, anomaly_reason = self.detect_anomalies(
            joint_velocities,
            end_effector_xyz
        )

        # One-shot enforcement: emit anomaly_detected=True for exactly ONE
        # telemetry POST, then force False for the rest of the cooldown.
        if anomaly_detected:
            if self._anomaly_emitted:
                anomaly_detected = False
                anomaly_reason = None
            else:
                self._anomaly_emitted = True
                print(f"[ANOMALY] t={self.t:.1f}s — {anomaly_reason}")
        # Reset the one-shot latch when cooldown expires
        if (self.t - self.last_anomaly_time) >= ANOMALY_COOLDOWN_SECONDS:
            self._anomaly_emitted = False

        self.previous_end_effector_xyz = end_effector_xyz[:]

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
        """Send telemetry via Edge Function AND broadcast via Supabase Realtime."""
        base = SUPABASE_URL or BACKEND_URL
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "apikey": SUPABASE_ANON_KEY
        }

        success = False

        # 1. Edge Function ingest (database persistence)
        ingest_url = f"{base}/functions/v1/telemetry-ingest"
        for attempt in range(3):
            try:
                response = httpx.post(ingest_url, json=payload, headers=headers, timeout=5.0)
                response.raise_for_status()
                success = True
                break
            except Exception as e:
                if attempt < 2:
                    time.sleep(0.5)
                    continue
                else:
                    print(f"[ERROR] Failed to send telemetry after 3 attempts: {e}")

        # 2. Realtime Broadcast (live dashboard feed)
        broadcast_url = f"{base}/realtime/v1/api/broadcast"
        broadcast_body = {
            "messages": [{
                "topic": "telemetry_stream",
                "event": "telemetry",
                "payload": payload
            }]
        }
        try:
            httpx.post(broadcast_url, json=broadcast_body, headers=headers, timeout=2.0)
        except Exception as e:
            # Broadcast failure is non-fatal — Edge Function is the primary path
            print(f"[WARN] Broadcast failed (non-fatal): {e}")

        return success

    def log_telemetry(self, payload: Dict):
        """Append telemetry payload to logs/telemetry.jsonl."""
        try:
            os.makedirs(os.path.dirname(self.log_file), exist_ok=True)
            with open(self.log_file, "a") as f:
                f.write(json.dumps(payload) + "\n")
        except Exception as e:
            print(f"[ERROR] Failed to write telemetry log: {e}")

    def run(self):
        """Main control loop — streams telemetry every 500 ms."""
        print(f"[CONTROLLER] Surgical arm controller started — phase: {self.phase}")
        print(f"[CONTROLLER] Streaming telemetry every {TELEMETRY_SEND_INTERVAL_MS} ms")
        self.last_telemetry_time = time.time() * 1000

        while self.robot.step(self.timestep) != -1:
            # Drive arm movement every physics step
            self.move_arm()

            # Stream telemetry at 500 ms intervals
            current_time = time.time() * 1000
            if current_time - self.last_telemetry_time >= TELEMETRY_SEND_INTERVAL_MS:
                payload = self.collect_telemetry()
                self.send_telemetry(payload)
                self.log_telemetry(payload)
                self.last_telemetry_time = current_time


if __name__ == "__main__":
    controller = SurgicalArmController()
    controller.run()