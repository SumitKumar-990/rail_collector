from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.api.train_registry import train_registry

router = APIRouter(prefix="/api", tags=["Network & Alerts"])

class SimulationEventRequest(BaseModel):
    train_id: str = "12301"
    event_type: str  # "rain", "congestion", "signal", "recovery", "reset"
    active: bool = True

@router.get("/network/congestion")
async def get_network_congestion():
    """
    Returns active route segment congestion scores, affected trains, and estimated delays.
    Endpoint: GET /api/network/congestion
    """
    return {
        "network_health_score": 82,
        "status": "Moderate Congestion",
        "corridor_segments": [
            {
                "route_segment": "Kanpur Central -> Prayagraj JN",
                "congestion_score": 0.88,
                "congestion_level": "CRITICAL",
                "affected_trains": 38,
                "estimated_delay": "+28 minutes",
                "data_source": "DERIVED / ESTIMATED"
            },
            {
                "route_segment": "Mathura JN -> Agra Cantt",
                "congestion_score": 0.65,
                "congestion_level": "HIGH",
                "affected_trains": 26,
                "estimated_delay": "+19 minutes",
                "data_source": "DERIVED / ESTIMATED"
            },
            {
                "route_segment": "Pt DD Upadhyaya -> Gaya JN",
                "congestion_score": 0.72,
                "congestion_level": "HIGH",
                "affected_trains": 31,
                "estimated_delay": "+22 minutes",
                "data_source": "DERIVED / ESTIMATED"
            },
            {
                "route_segment": "Surat -> Vadodara JN",
                "congestion_score": 0.15,
                "congestion_level": "LOW",
                "affected_trains": 22,
                "estimated_delay": "+4 minutes",
                "data_source": "DERIVED / ESTIMATED"
            }
        ]
    }

@router.get("/alerts")
async def get_operational_alerts():
    """
    Returns operational, weather, congestion, and critical delay alerts.
    Endpoint: GET /api/alerts
    """
    return [
        {
            "id": "alert-101",
            "type": "congestion",
            "title": "Critical Downstream Congestion",
            "location": "Kanpur Central (CNB) Sector 4",
            "affected_trains": 14,
            "expected_impact": "+25 to +35 minutes",
            "severity": "critical",
            "data_source": "DERIVED / ESTIMATED"
        },
        {
            "id": "alert-102",
            "type": "speed_restriction",
            "title": "Temporary Speed Restriction (TSR)",
            "location": "Dhanbad Division KM 284",
            "affected_trains": 9,
            "expected_impact": "+10 to +15 minutes",
            "severity": "warning",
            "data_source": "OPERATIONAL_METADATA"
        },
        {
            "id": "alert-103",
            "type": "weather",
            "title": "Torrential Weather & Fog Warning",
            "location": "Eastern Railway Division (Barddhaman)",
            "affected_trains": 18,
            "expected_impact": "+15 to +20 minutes",
            "severity": "warning",
            "data_source": "OPEN_METEO_WEATHER_API"
        }
    ]

@router.post("/simulation/event")
async def trigger_simulation_event(req: SimulationEventRequest):
    """
    Injects operational events by modifying the train state feature vector components in TrainRegistry.
    Triggers true ML model re-inference on subsequent ETA requests.
    """
    train = train_registry.get_train_by_id(req.train_id)
    if not train:
        return {"error": f"Train {req.train_id} not found in dynamic registry"}

    if req.event_type == "rain":
        # Heavy Rain modifies weather_score and rainfall_mm features
        train["weather_score"] = 0.85 if req.active else 0.35
        train["rainfall_mm"] = 45.0 if req.active else 8.0
        train["current_delay_minutes"] += (8.0 if req.active else -8.0)
    elif req.event_type == "congestion":
        # Congestion modifies congestion_score feature
        train["congestion_score"] = 0.88 if req.active else 0.45
        train["current_delay_minutes"] += (12.0 if req.active else -12.0)
    elif req.event_type == "signal":
        # Signal hold modifies signal_delay_score and current speed features
        train["signal_delay_score"] = 0.95 if req.active else 0.0
        train["speed"] = 28.0 if req.active else 92.0
        train["current_delay_minutes"] += (15.0 if req.active else -15.0)
    elif req.event_type == "recovery":
        # Priority green corridor reduces delay and increases sectional speed
        train["speed"] = 118.0 if req.active else 92.0
        train["current_delay_minutes"] = max(0.0, train["current_delay_minutes"] - (10.0 if req.active else -10.0))
    elif req.event_type == "reset":
        # Reset to default feature state
        train["weather_score"] = 0.35
        train["rainfall_mm"] = 8.0
        train["congestion_score"] = 0.45
        train["speed_restriction_score"] = 0.4
        train["signal_delay_score"] = 0.0
        train["current_delay_minutes"] = 18.0
        train["speed"] = 92.0

    train["current_delay_minutes"] = max(0.0, train["current_delay_minutes"])
    train["is_simulated"] = req.active and req.event_type != "reset"

    return {
        "status": "success",
        "train_id": req.train_id,
        "event_type": req.event_type,
        "active": req.active,
        "is_simulated": train["is_simulated"],
        "updated_features": {
            "weather_score": train["weather_score"],
            "rainfall_mm": train["rainfall_mm"],
            "congestion_score": train["congestion_score"],
            "signal_delay_score": train["signal_delay_score"],
            "current_delay_minutes": train["current_delay_minutes"],
            "speed_kmph": train["speed"]
        }
    }
