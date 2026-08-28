import numpy as np
import pandas as pd
from typing import Dict, Any, List

def calculate_distance_remaining(total_distance_km: float, distance_covered_km: float) -> float:
    """Calculates remaining distance on the train route in km."""
    return max(0.0, float(total_distance_km - distance_covered_km))

def calculate_scheduled_remaining_time(distance_remaining_km: float, average_sectional_speed_kmph: float = 85.0) -> float:
    """Calculates scheduled remaining journey time in minutes based on timetabled average speed."""
    if average_sectional_speed_kmph <= 0:
        average_sectional_speed_kmph = 85.0
    return float((distance_remaining_km / average_sectional_speed_kmph) * 60.0)

def calculate_weather_score(rainfall_mm: float, fog_visibility_meters: float = 1000.0) -> float:
    """
    Calculates weather disruption score (0.0 to 1.0).
    Explicitly accounts for monsoon rainfall and winter fog visibility.
    """
    rain_score = min(1.0, rainfall_mm / 50.0)
    fog_score = 0.0
    if fog_visibility_meters < 200:
        fog_score = 0.9
    elif fog_visibility_meters < 500:
        fog_score = 0.5
    elif fog_visibility_meters < 800:
        fog_score = 0.2
    return float(max(rain_score, fog_score))

def calculate_estimated_congestion_score(
    active_delayed_trains: int,
    section_avg_delay_minutes: float = 0.0,
    max_section_capacity: int = 15
) -> float:
    """
    [DERIVED / ESTIMATED FEATURE]
    Derives track section congestion score (0.0 to 1.0) using pre-prediction timestamp
    sectional train density and route segment average delay.
    """
    if max_section_capacity <= 0:
        return 0.0
    density_ratio = min(1.0, active_delayed_trains / float(max_section_capacity))
    delay_ratio = min(1.0, section_avg_delay_minutes / 45.0)
    
    # Combined derived score
    congestion_score = (density_ratio * 0.6) + (delay_ratio * 0.4)
    return float(round(min(1.0, congestion_score), 2))

def calculate_speed_restriction_score(
    tsr_speed_cap_kmph: float,
    max_permissible_speed_kmph: float = 130.0
) -> float:
    """Calculates Temporary Speed Restriction (TSR) caution order disruption score."""
    if tsr_speed_cap_kmph >= max_permissible_speed_kmph:
        return 0.0
    reduction = max_permissible_speed_kmph - tsr_speed_cap_kmph
    return float(min(1.0, reduction / max_permissible_speed_kmph))

def estimate_missing_gps_position(
    last_station_dist_km: float,
    elapsed_minutes_since_last_station: float,
    sectional_speed_kmph: float = 75.0,
    total_route_dist_km: float = 1000.0
) -> Dict[str, Any]:
    """
    [ESTIMATED TELEMETRY FALLBACK]
    Fallback estimation logic when live GPS telemetry is missing/dropped.
    Estimates position based on last known station node, elapsed time, and sectional timetable speed.
    """
    estimated_progress_km = (sectional_speed_kmph / 60.0) * elapsed_minutes_since_last_station
    estimated_covered_km = min(total_route_dist_km, last_station_dist_km + estimated_progress_km)
    estimated_remaining_km = max(0.0, total_route_dist_km - estimated_covered_km)
    
    return {
        "distance_covered_km": round(estimated_covered_km, 1),
        "distance_remaining_km": round(estimated_remaining_km, 1),
        "is_estimated": True,
        "telemetry_source": "ESTIMATED_SECTIONAL_RUNNING"
    }

class GroupbyDelayAggregator:
    """
    Calculates leakage-free groupby average delay features derived strictly from training split data.
    """
    def __init__(self):
        self.train_avg_map = {}
        self.station_avg_map = {}
        self.global_mean_delay = 12.0

    def fit(self, df_train: pd.DataFrame, delay_col: str = "current_delay_minutes"):
        """Fits historical average delay aggregations strictly on the training set."""
        if delay_col not in df_train.columns:
            return
        
        self.global_mean_delay = float(df_train[delay_col].mean())
        
        if "train_id" in df_train.columns:
            self.train_avg_map = df_train.groupby("train_id")[delay_col].mean().to_dict()
        elif "train_number" in df_train.columns:
            self.train_avg_map = df_train.groupby("train_number")[delay_col].mean().to_dict()

        if "station_code" in df_train.columns:
            self.station_avg_map = df_train.groupby("station_code")[delay_col].mean().to_dict()

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Applies fitted aggregations to feature matrix without target leakage."""
        df_out = df.copy()
        train_col = "train_id" if "train_id" in df_out.columns else "train_number"
        st_col = "station_code" if "station_code" in df_out.columns else "source_station"

        if train_col in df_out.columns:
            df_out["historical_avg_delay_minutes"] = df_out[train_col].map(self.train_avg_map).fillna(self.global_mean_delay)
        else:
            df_out["historical_avg_delay_minutes"] = self.global_mean_delay

        if st_col in df_out.columns:
            df_out["station_avg_delay_minutes"] = df_out[st_col].map(self.station_avg_map).fillna(self.global_mean_delay)
        else:
            df_out["station_avg_delay_minutes"] = self.global_mean_delay

        df_out["route_avg_delay_minutes"] = (df_out["historical_avg_delay_minutes"] + df_out["station_avg_delay_minutes"]) / 2.0
        return df_out
