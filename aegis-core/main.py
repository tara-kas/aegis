import sys
import os
import time

from robot.surgical_arm_controller import SurgicalArmController
from reasoning.crusoe_client import analyse_telemetry
from config import TELEMETRY_INTERVAL_MS

def main():
    print("[AEGIS] Starting Unified System Orchestrator...")
    try:
        controller = SurgicalArmController()
    except Exception as e:
        print(f"[ERROR] Could not initialize SurgicalArmController. Ensure Webots is running and WEBOTS_HOME is set. {e}")
        return

    print(f"[AEGIS] Surgical arm controller started — phase: {controller.phase}")
    print(f"[AEGIS] Streaming telemetry every {TELEMETRY_INTERVAL_MS} ms")
    
    last_telemetry_time = time.time() * 1000
    
    while controller.robot.step(controller.timestep) != -1:
        controller.move_arm()
        
        current_time = time.time() * 1000
        if current_time - last_telemetry_time >= TELEMETRY_INTERVAL_MS:
            # 1. Collect raw kinematics
            payload = controller.collect_telemetry()
            payload["surgical_session_id"] = "session-001"
            
            # 2. Trigger AI Reasoning if anomaly physically detected
            if payload.get("anomaly_detected"):
                print("[AEGIS] Physical anomaly flag raised. Offloading to Crusoe LLM...")
                analysis = analyse_telemetry(payload)
                payload["llm_analysis"] = analysis
            
            # 3. Transmit payload
            controller.send_telemetry(payload)
            controller.log_telemetry(payload)
            
            last_telemetry_time = current_time

if __name__ == "__main__":
    main()
