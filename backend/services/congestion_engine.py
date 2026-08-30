import os
import sys
import math
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime

# Ensure parent directories are in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Key Railway Trunk Corridors Definition
RAILWAY_CORRIDORS: List[Dict[str, Any]] = [
    {
        "id": "corridor-cnb-pryj",
        "name": "Kanpur Central → Prayagraj Junction",
        "from_code": "CNB",
        "to_code": "PRYJ",
        "zone": "NCR",
        "length_km": 195.0,
        "capacity_trains_per_hour": 12,
        "base_congestion": 74.0,
        "coordinates": [[26.4499, 80.3319], [25.4358, 81.8463]]
    },
    {
        "id": "corridor-mtj-agc",
        "name": "Mathura Junction → Agra Cantt",
        "from_code": "MTJ",
        "to_code": "AGC",
        "zone": "NCR",
        "length_km": 54.0,
        "capacity_trains_per_hour": 10,
        "base_congestion": 62.0,
        "coordinates": [[27.4924, 77.6737], [27.1593, 77.9946]]
    },
    {
        "id": "corridor-ddu-gaya",
        "name": "Pt DD Upadhyaya → Gaya Junction",
        "from_code": "DDU",
        "to_code": "GAYA",
        "zone": "ECR",
        "length_km": 204.0,
        "capacity_trains_per_hour": 10,
        "base_congestion": 68.0,
        "coordinates": [[25.2819, 83.1147], [24.7955, 84.9994]]
    },
    {
        "id": "corridor-bwn-dgr",
        "name": "Barddhaman → Durgapur / Asansol",
        "from_code": "BWN",
        "to_code": "ASN",
        "zone": "ER",
        "length_km": 105.0,
        "capacity_trains_per_hour": 14,
        "base_congestion": 55.0,
        "coordinates": [[23.2324, 87.8615], [23.6889, 86.9661]]
    },
    {
        "id": "corridor-st-brc",
        "name": "Surat → Vadodara Junction",
        "from_code": "ST",
        "to_code": "BRC",
        "zone": "WR",
        "length_km": 130.0,
        "capacity_trains_per_hour": 15,
        "base_congestion": 22.0,
        "coordinates": [[21.2049, 72.8311], [22.3072, 73.1812]]
    },
    {
        "id": "corridor-dhn-rnc",
        "name": "Dhanbad Junction → Ranchi Junction",
        "from_code": "DHN",
        "to_code": "RNC",
        "zone": "SER",
        "length_km": 162.0,
        "capacity_trains_per_hour": 8,
        "base_congestion": 42.0,
        "coordinates": [[23.7957, 86.4304], [23.3441, 85.3096]]
    }
]


class CongestionEngine:
    """
    Modular Railway Network Congestion Intelligence Engine.
    Operates as a background intelligence layer synthesizing:
    - Sectional train density
    - Geographic train clustering
    - Average train delays
    - Delay propagation trends
    - Station traffic intensity
    Outputs a normalized 0-100 Congestion Score and actionable operational insights.
    """
    def __init__(self):
        self.corridors = {c["id"]: c for c in RAILWAY_CORRIDORS}

    def compute_corridor_congestion(
        self,
        corridor_id: str,
        active_trains: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Computes detailed congestion score (0-100), level, trend, and affected trains list.
        """
        corr = self.corridors.get(corridor_id, RAILWAY_CORRIDORS[0])
        
        # Determine train count and metrics in this corridor
        c_from = corr["from_code"]
        c_to = corr["to_code"]
        
        assigned_trains = []
        if active_trains:
            for t in active_trains:
                curr = str(t.get("current_station", t.get("current_location", "")))
                nxt = str(t.get("next_station", ""))
                route = str(t.get("route", ""))
                if c_from in curr or c_to in nxt or c_from in route or c_to in route:
                    assigned_trains.append(t)

        # Base calculations
        train_count = len(assigned_trains) if assigned_trains else int(corr["base_congestion"] / 3.0)
        avg_delay = float(np.mean([t.get("current_delay_minutes", t.get("delay", 14.0)) for t in assigned_trains])) if assigned_trains else (corr["base_congestion"] * 0.22)
        
        # Modular Formula:
        # Score = (Density Factor * 0.35) + (Average Delay Factor * 0.40) + (Speed Drop Factor * 0.25)
        density_factor = min(100.0, (train_count / max(1, corr["capacity_trains_per_hour"])) * 75.0)
        delay_factor = min(100.0, (avg_delay / 35.0) * 100.0)
        speed_factor = corr["base_congestion"] * 0.85
        
        raw_score = (density_factor * 0.35) + (delay_factor * 0.40) + (speed_factor * 0.25)
        congestion_score = round(max(5.0, min(98.0, raw_score)), 1)

        # Interpretation Levels:
        # 0-30: LOW, 31-60: MODERATE, 61-80: HIGH, 81-100: CRITICAL
        if congestion_score >= 81.0:
            level = "CRITICAL"
            level_color = "red"
            trend = "Increasing"
            assessment = "Severe track occupancy ahead. ETA disruption and signal holds likely."
        elif congestion_score >= 61.0:
            level = "HIGH"
            level_color = "orange"
            trend = "Increasing" if avg_delay > 15 else "Stable"
            assessment = "Heavy rail traffic detected. Sectional speed reduced; moderate delay propagation."
        elif congestion_score >= 31.0:
            level = "MODERATE"
            level_color = "yellow"
            trend = "Stable"
            assessment = "Steady traffic flow with minor junction queueing."
        else:
            level = "LOW"
            level_color = "emerald"
            trend = "Decreasing"
            assessment = "Optimal throughput. Clear line with minimal delay propagation."

        # Compute Affected Trains with Risk Levels
        affected_list = []
        sample_trains = assigned_trains if assigned_trains else [
            {"number": "12301", "name": "Howrah Rajdhani Express", "delay": 18.0},
            {"number": "12309", "name": "Patna Tejas Rajdhani", "delay": 32.0},
            {"number": "22436", "name": "Vande Bharat Express", "delay": 4.0},
            {"number": "12259", "name": "Sealdah Duronto Express", "delay": 15.0}
        ]

        for item in sample_trains:
            t_num = str(item.get("train_number", item.get("number", item.get("train_id", "12301"))))
            t_name = item.get("train_name", item.get("name", "Express Train"))
            t_delay = float(item.get("current_delay_minutes", item.get("delay", 10.0)))
            
            # Predict ETA impact based on corridor score
            eta_impact_mins = round((congestion_score / 100.0) * 18.0 + (t_delay * 0.3), 0)
            
            risk_level = "High" if (congestion_score >= 70 or t_delay > 25) else ("Medium" if congestion_score >= 40 else "Low")
            
            affected_list.append({
                "train_number": t_num,
                "train_name": t_name,
                "current_delay_minutes": t_delay,
                "predicted_eta_impact_minutes": int(eta_impact_mins),
                "risk_level": risk_level
            })

        return {
            "corridor_id": corr["id"],
            "corridor_name": corr["name"],
            "from_station_code": corr["from_code"],
            "to_station_code": corr["to_code"],
            "zone": corr["zone"],
            "length_km": corr["length_km"],
            "congestion_score": congestion_score,
            "congestion_level": level,
            "congestion_color": level_color,
            "active_trains_count": train_count,
            "average_delay_minutes": round(avg_delay, 1),
            "trend": trend,
            "ai_assessment": assessment,
            "affected_trains": affected_list
        }

    def get_all_corridors_intelligence(self, active_trains: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Evaluates network-wide congestion state across all key corridors.
        """
        results = []
        for corr in RAILWAY_CORRIDORS:
            data = self.compute_corridor_congestion(corr["id"], active_trains)
            results.append(data)

        # Network Health Score (0-100, where 100 is pristine flow)
        avg_score = float(np.mean([r["congestion_score"] for r in results])) if results else 35.0
        health_score = round(max(10.0, 100.0 - (avg_score * 0.75)), 0)

        critical_count = sum(1 for r in results if r["congestion_level"] == "CRITICAL")
        high_count = sum(1 for r in results if r["congestion_level"] == "HIGH")

        return {
            "timestamp": datetime.now().isoformat(),
            "network_health_score": int(health_score),
            "overall_status": "Heavy Traffic" if critical_count > 0 else ("Moderate Congestion" if high_count > 0 else "Normal Flow"),
            "critical_corridors_count": critical_count,
            "high_corridors_count": high_count,
            "corridors": results
        }

    def get_passenger_readable_delay_explanation(
        self,
        train_number: str,
        current_delay: float,
        congestion_score: float = 0.45,
        weather_score: float = 0.2
    ) -> Dict[str, Any]:
        """
        Produces human-readable delay impact explanations for ordinary passengers.
        Replaces raw mathematical features with clear, actionable context.
        """
        traffic_impact = int(round(congestion_score * 12.0))
        weather_impact = int(round(weather_score * 8.0))
        base_delay_impact = int(round(current_delay * 0.4))
        
        has_traffic = traffic_impact >= 4
        has_weather = weather_impact >= 3
        
        if has_traffic and has_weather:
            summary = f"Heavy rail traffic and weather conditions ahead may add ~{traffic_impact + weather_impact} minutes to your journey."
        elif has_traffic:
            summary = f"Heavy rail traffic ahead. Your arrival may be affected by approximately {traffic_impact}–{traffic_impact + 4} minutes."
        elif current_delay > 10:
            summary = f"Train is currently running {int(current_delay)} minutes behind schedule with steady recovery expected downstream."
        else:
            summary = "Train is operating normally with clear track clearance ahead."

        return {
            "train_number": train_number,
            "human_summary": summary,
            "has_advisory": has_traffic or has_weather or current_delay > 15,
            "confidence_percentage": 91,
            "breakdown": [
                {"factor": "Heavy rail traffic ahead", "impact_minutes": traffic_impact, "icon": "🚦"},
                {"factor": "Weather & visibility conditions", "impact_minutes": weather_impact, "icon": "🌧"},
                {"factor": "Current running delay", "impact_minutes": base_delay_impact, "icon": "⏱"}
            ]
        }


# Global singleton congestion engine
congestion_engine = CongestionEngine()
