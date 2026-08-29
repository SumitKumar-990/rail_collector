import os
import sys
from fastapi import APIRouter, HTTPException, Query, Body
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml.predict import predictor
from ml.feature_engineering import (
    calculate_distance_remaining,
    calculate_scheduled_remaining_time
)
from app.api.train_registry import train_registry
from data.dataset_metadata import get_dataset_metadata

router = APIRouter(prefix="/api", tags=["Trains"])

@router.get("/trains")
async def get_all_active_trains():
    """
    [PRIORITY 1: TRUE MULTI-TRAIN LIVE ETA SYSTEM]
    Returns all active trains and their live state from the dynamic Train Registry.
    Endpoint: GET /api/trains
    """
    trains = train_registry.get_all_trains()
    return {
        "count": len(trains),
        "status": "Operational",
        "trains": trains
    }

@router.post("/trains/batch-eta")
async def batch_predict_train_eta(payload: Dict[str, Any] = Body(default={})):
    """
    [PRIORITY 1 & 2: BATCH ETA PREDICTION & DUAL MODEL COMPARISON]
    Performs batch ML inference across multiple active train records using BOTH trained models
    (XGBoost Regressor & Random Forest Regressor) plus Schedule Baseline.
    Endpoint: POST /api/trains/batch-eta
    """
    train_records = payload.get("trains", [])
    
    # If empty payload passed, perform batch predictions for all trains in the dynamic registry
    if not train_records:
        active_trains = train_registry.get_all_trains()
        train_records = []
        for t in active_trains:
            dist_rem = calculate_distance_remaining(t["total_distance_km"], t["distance_covered_km"])
            sched_rem_time = calculate_scheduled_remaining_time(dist_rem, 85.0)
            train_records.append({
                "train_id": t["train_id"],
                "train_name": t["train_name"],
                "destination": t["destination"],
                "current_delay_minutes": t["current_delay_minutes"],
                "current_speed_kmph": t["speed"],
                "distance_remaining_km": dist_rem,
                "scheduled_remaining_time_minutes": sched_rem_time,
                "weather_score": t["weather_score"],
                "rainfall_mm": t["rainfall_mm"],
                "congestion_score": t["congestion_score"],
                "speed_restriction_score": t["speed_restriction_score"],
                "signal_delay_score": t["signal_delay_score"],
                "is_estimated": t["is_estimated"],
                "is_simulated": t.get("is_simulated", False)
            })

    results = predictor.predict_batch_eta(train_records)
    return {
        "count": len(results),
        "timestamp": datetime.now().isoformat(),
        "predictions": results
    }

@router.get("/dataset/metadata")
async def get_dataset_info_metadata():
    """
    [PRIORITY 0 & 3: DATASET METADATA & DATA REALISM]
    Returns dataset metadata, record counts, train/test split info, and fallback priority hierarchy.
    Endpoint: GET /api/dataset/metadata
    """
    return get_dataset_metadata()

@router.get("/trains/{train_id}/live")
async def get_live_train_status(train_id: str):
    """
    Returns live running status, coordinates, current speed, and delay for a specific train.
    Endpoint: GET /api/trains/{train_id}/live
    """
    train = train_registry.get_train_by_id(train_id)
    if not train:
        raise HTTPException(status_code=404, detail=f"Train {train_id} not found in dynamic registry")
        
    return {
        "train_id": train["train_id"],
        "train_number": train["train_number"],
        "train_name": train["train_name"],
        "current_station": train["current_station"],
        "latitude": train["latitude"],
        "longitude": train["longitude"],
        "speed": train["speed"],
        "current_delay_minutes": train["current_delay_minutes"],
        "data_source": train["data_source"]
    }

@router.get("/trains/{train_id}/eta")
async def get_train_eta_prediction(train_id: str):
    """
    [PRIORITY 2 & 4: REAL DUAL MODEL PREDICTIONS & DATA RELIABILITY SCORE]
    Returns XGBoost prediction, Random Forest prediction, Schedule Baseline, Data Reliability Score, and lineage tags.
    Endpoint: GET /api/trains/{train_id}/eta
    """
    train = train_registry.get_train_by_id(train_id)
    if not train:
        raise HTTPException(status_code=404, detail=f"Train {train_id} not found in dynamic registry")

    dist_rem = calculate_distance_remaining(train["total_distance_km"], train["distance_covered_km"])
    sched_rem_time = calculate_scheduled_remaining_time(dist_rem, 85.0)

    feature_dict = {
        "train_id": train["train_id"],
        "current_delay_minutes": train["current_delay_minutes"],
        "current_speed_kmph": train["speed"],
        "distance_to_next_station_km": 65.0,
        "distance_remaining_km": dist_rem,
        "scheduled_remaining_time_minutes": sched_rem_time,
        "historical_avg_delay_minutes": train.get("historical_delay", 14.0),
        "station_avg_delay_minutes": 8.0,
        "route_avg_delay_minutes": 11.0,
        "hour_of_day": datetime.now().hour,
        "day_of_week": datetime.now().weekday(),
        "month": datetime.now().month,
        "weather_score": train["weather_score"],
        "rainfall_mm": train["rainfall_mm"],
        "congestion_score": train["congestion_score"],
        "speed_restriction_score": train["speed_restriction_score"],
        "signal_delay_score": train["signal_delay_score"],
        "previous_station_delay": train["current_delay_minutes"],
        "upcoming_station_count": 5,
        "is_estimated": train["is_estimated"],
        "is_simulated": train.get("is_simulated", False)
    }

    current_ts = datetime.now()
    target_st = train.get("target_station", train["next_station"])
    prediction_result = predictor.predict_dynamic_eta(feature_dict, current_time=current_ts, target_station=target_st)

    # Return structured dual model predictions + baseline
    return {
        "train_id": train["train_id"],
        "train_name": train["train_name"],
        "prediction_timestamp": prediction_result["prediction_timestamp"],
        "target_station": target_st,
        "remaining_travel_time_minutes": prediction_result["remaining_travel_time_minutes"],
        "predicted_eta": prediction_result["predicted_eta"],
        "predicted_eta_formatted": prediction_result["predicted_eta_formatted"],
        "delay_minutes": int(train["current_delay_minutes"]),
        
        # Real Model Comparisons (Priority 2)
        "model_predictions": prediction_result["model_predictions"],
        "schedule_baseline_minutes": prediction_result["model_predictions"]["schedule_baseline_minutes"],
        "random_forest_minutes": prediction_result["model_predictions"]["random_forest_minutes"],
        "xgboost_minutes": prediction_result["model_predictions"]["xgboost_minutes"],

        # Data Reliability Score (Priority 4)
        "data_reliability_score": prediction_result["data_reliability_score"],
        "data_quality": prediction_result["data_quality"],
        "data_sources": prediction_result["data_sources"],
        "data_source_transparency": {
            "is_live_gps": not train["is_estimated"],
            "is_estimated": train["is_estimated"],
            "is_simulated": train.get("is_simulated", False),
            "model_type": "XGBoost Regressor (eta_xgboost.json) + Random Forest (eta_random_forest.pkl)"
        },
        "validation_notice": "Validated on current engineered prototype dataset"
    }

@router.get("/trains/{train_id}/eta/explanation")
async def get_train_eta_explanation(train_id: str):
    """
    [PRIORITY 5: OPERATIONAL ETA IMPACT ANALYSIS]
    Returns factor contribution breakdown for schedule variance.
    Endpoint: GET /api/trains/{train_id}/eta/explanation
    """
    train = train_registry.get_train_by_id(train_id)
    if not train:
        raise HTTPException(status_code=404, detail=f"Train {train_id} not found in dynamic registry")

    dist_rem = calculate_distance_remaining(train["total_distance_km"], train["distance_covered_km"])
    sched_rem_time = calculate_scheduled_remaining_time(dist_rem, 85.0)

    feature_dict = {
        "train_id": train["train_id"],
        "current_delay_minutes": train["current_delay_minutes"],
        "current_speed_kmph": train["speed"],
        "distance_remaining_km": dist_rem,
        "scheduled_remaining_time_minutes": sched_rem_time,
        "weather_score": train["weather_score"],
        "rainfall_mm": train["rainfall_mm"],
        "congestion_score": train["congestion_score"],
        "speed_restriction_score": train["speed_restriction_score"],
        "signal_delay_score": train["signal_delay_score"],
        "route_avg_delay_minutes": 11.0,
        "is_estimated": train["is_estimated"]
    }

    prediction_result = predictor.predict_dynamic_eta(feature_dict)

    return {
        "train_id": train["train_id"],
        "explanation_type": "Operational ETA Impact Analysis",
        "prediction": {
            "eta": prediction_result["predicted_eta_formatted"],
            "reliability_score": prediction_result["data_reliability_score"],
            "remaining_travel_time_minutes": prediction_result["remaining_travel_time_minutes"]
        },
        "factors": prediction_result["prediction_factors"],
        "total_impact_minutes": sum(f["impact_minutes"] for f in prediction_result["prediction_factors"])
    }

@router.get("/trains/{train_number}/route-eta")
async def get_train_route_eta(
    train_number: str,
    current_station_code: str = Query("NDLS", description="Current station code of the train"),
    current_delay: float = Query(0.0, description="Current delay in minutes"),
    current_status: str = Query("RUNNING", description="Running status of train")
):
    """
    [CHRONOLOGICAL ETA PREDICTION & VALIDATION LAYER ENDPOINT]
    Validates train inputs, computes predictions for every station on the route,
    and enforces strict MONOTONIC CHRONOLOGICAL ETA ORDERING.
    Endpoint: GET /api/trains/{train_number}/route-eta
    """
    st_code = current_station_code if isinstance(current_station_code, str) else "NDLS"
    delay_val = float(current_delay) if isinstance(current_delay, (int, float)) else 0.0
    status_val = current_status if isinstance(current_status, str) else "RUNNING"

    result = predictor.predict_route_eta(
        train_number=train_number,
        current_station_code=st_code,
        current_delay=delay_val,
        current_status=status_val
    )
    if not result.get("valid", True):
        raise HTTPException(status_code=400, detail=result.get("error", "Validation failed"))
    return result


