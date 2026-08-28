import numpy as np

def calculate_feature_attributions(feature_dict: dict) -> list:
    """
    Computes lightweight feature contribution approximations for model explainability.
    Quantifies the exact impact (in minutes) of operational disruptions.
    """
    current_delay = feature_dict.get("current_delay_minutes", 0.0)
    weather_score = feature_dict.get("weather_score", 0.0)
    congestion_score = feature_dict.get("congestion_score", 0.0)
    speed_restriction_score = feature_dict.get("speed_restriction_score", 0.0)
    signal_delay_score = feature_dict.get("signal_delay_score", 0.0)
    
    factors = []
    
    # 1. Downstream Congestion
    if congestion_score > 0.0:
        congestion_mins = round(congestion_score * 25.0)
        if congestion_mins > 0:
            factors.append({
                "factor": "Downstream Congestion",
                "impact_minutes": int(congestion_mins),
                "category": "congestion",
                "severity": "HIGH" if congestion_mins > 15 else "MEDIUM"
            })
            
    # 2. Temporary Speed Restriction
    if speed_restriction_score > 0.0:
        tsr_mins = round(speed_restriction_score * 12.0)
        if tsr_mins > 0:
            factors.append({
                "factor": "Speed Restriction (TSR)",
                "impact_minutes": int(tsr_mins),
                "category": "speed_restriction",
                "severity": "MEDIUM"
            })
            
    # 3. Weather & Visibility
    if weather_score > 0.0:
        weather_mins = round(weather_score * 15.0)
        if weather_mins > 0:
            factors.append({
                "factor": "Weather & Fog Impact",
                "impact_minutes": int(weather_mins),
                "category": "weather",
                "severity": "MEDIUM"
            })
            
    # 4. Signal Interlock Hold
    if signal_delay_score > 0.0:
        signal_mins = round(signal_delay_score * 18.0)
        if signal_mins > 0:
            factors.append({
                "factor": "Signal Clearance Interlock",
                "impact_minutes": int(signal_mins),
                "category": "signal",
                "severity": "HIGH"
            })
            
    # 5. Historical Schedule Padding Buffer Recovery
    if current_delay > 10.0 or len(factors) > 0:
        recovery_mins = -min(5, int(round(current_delay * 0.15)))
        if recovery_mins < 0:
            factors.append({
                "factor": "Historical Schedule Recovery",
                "impact_minutes": int(recovery_mins),
                "category": "recovery",
                "severity": "RECOVERY"
            })

    if not factors:
        factors.append({
            "factor": "Optimal Track Signals",
            "impact_minutes": 0,
            "category": "recovery",
            "severity": "NORMAL"
        })

    return factors
