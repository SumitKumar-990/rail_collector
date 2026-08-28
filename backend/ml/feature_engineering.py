import numpy as np

def calculate_distance_remaining(total_distance_km: float, distance_covered_km: float) -> float:
    """Calculates remaining distance on the route."""
    return max(0.0, float(total_distance_km - distance_covered_km))

def calculate_historical_delay(historical_delays: list) -> float:
    """Calculates historical delay weight."""
    if not historical_delays:
        return 0.0
    return float(np.mean(historical_delays))

def calculate_station_delay(station_delay_history: list) -> float:
    """Calculates station-specific average delay factor."""
    if not station_delay_history:
        return 0.0
    return float(np.median(station_delay_history))

def calculate_route_delay(route_segment_delays: list) -> float:
    """Calculates corridor segment delay density."""
    if not route_segment_delays:
        return 0.0
    return float(np.mean(route_segment_delays))

def calculate_weather_score(rainfall_mm: float, fog_visibility_meters: float = 1000.0) -> float:
    """Calculates weather disruption score (0.0 to 1.0)."""
    rain_score = min(1.0, rainfall_mm / 50.0)
    fog_score = 0.0
    if fog_visibility_meters < 200:
        fog_score = 0.9
    elif fog_visibility_meters < 500:
        fog_score = 0.5
    elif fog_visibility_meters < 800:
        fog_score = 0.2
    return float(max(rain_score, fog_score))

def calculate_congestion_score(active_trains_in_section: int, max_section_capacity: int = 15) -> float:
    """Calculates track section congestion score (0.0 to 1.0)."""
    if max_section_capacity <= 0:
        return 0.0
    return float(min(1.0, active_trains_in_section / max_section_capacity))

def calculate_speed_restriction_score(tsr_speed_cap_kmph: float, max_permissible_speed_kmph: float = 130.0) -> float:
    """Calculates Temporary Speed Restriction (TSR) caution order score."""
    if tsr_speed_cap_kmph >= max_permissible_speed_kmph:
        return 0.0
    reduction = max_permissible_speed_kmph - tsr_speed_cap_kmph
    return float(min(1.0, reduction / max_permissible_speed_kmph))

def calculate_scheduled_remaining_time(distance_remaining_km: float, average_sectional_speed_kmph: float = 85.0) -> float:
    """Calculates scheduled remaining journey time in minutes."""
    if average_sectional_speed_kmph <= 0:
        average_sectional_speed_kmph = 85.0
    return float((distance_remaining_km / average_sectional_speed_kmph) * 60.0)

def estimate_missing_gps_position(
    last_station_dist_km: float,
    elapsed_minutes_since_last_station: float,
    sectional_speed_kmph: float = 75.0,
    total_route_dist_km: float = 1000.0
) -> dict:
    """
    Fallback estimation logic when live GPS telemetry is unavailable.
    Estimates position based on last known station, elapsed time, and sectional speed.
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
