import os
import pandas as pd
import numpy as np

def build_unified_ml_dataset(raw_df_path: str, output_path: str) -> pd.DataFrame:
    """
    Transforms raw train journey records into the unified ML feature dataset.
    """
    if not os.path.exists(raw_df_path):
        from ingestion import generate_indian_railways_raw_data
        df = generate_indian_railways_raw_data(2000)
    else:
        df = pd.read_csv(raw_df_path)

    # Feature transformation & engineering enrichment
    df["current_station_id"] = df["station_id"]
    df["next_station_id"] = df["station_id"].apply(lambda x: f"NEXT_{x}")
    
    # Synthesize coordinates for Indian Railway station nodes
    station_coords = {
        "NDLS": (28.6139, 77.2090),
        "CNB": (26.4499, 80.3319),
        "PRYJ": (25.4358, 81.8463),
        "DDU": (25.2819, 83.1147),
        "GAYA": (24.7955, 84.9994),
        "DHN": (23.7957, 86.4304),
        "HWH": (22.5851, 88.3426)
    }
    
    lats = []
    lngs = []
    for code in df["station_code"]:
        coords = station_coords.get(code, (26.0, 80.0))
        lats.append(coords[0] + np.random.normal(0, 0.05))
        lngs.append(coords[1] + np.random.normal(0, 0.05))

    df["latitude"] = lats
    df["longitude"] = lngs
    df["distance_to_next_station_km"] = np.random.uniform(15, 120, size=len(df))
    df["historical_avg_delay_minutes"] = df["historical_route_delay"]
    df["station_avg_delay_minutes"] = df["historical_station_delay"]
    df["route_avg_delay_minutes"] = (df["historical_route_delay"] + df["historical_station_delay"]) / 2.0
    df["previous_station_delay"] = np.maximum(0, df["current_delay_minutes"] - np.random.uniform(0, 5, size=len(df)))
    df["upcoming_station_count"] = np.random.randint(1, 10, size=len(df))

    feature_cols = [
        "train_id", "timestamp", "current_station_id", "next_station_id",
        "latitude", "longitude", "current_delay_minutes", "current_speed_kmph",
        "distance_to_next_station_km", "distance_remaining_km",
        "scheduled_remaining_time_minutes", "historical_avg_delay_minutes",
        "station_avg_delay_minutes", "route_avg_delay_minutes",
        "hour_of_day", "day_of_week", "month", "weather_score", "rainfall_mm",
        "congestion_score", "speed_restriction_score", "signal_delay_score",
        "previous_station_delay", "upcoming_station_count",
        "remaining_travel_time_minutes"
    ]

    processed_df = df[feature_cols].copy()
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    processed_df.to_csv(output_path, index=False)
    print(f"Created unified ML dataset: {output_path} ({len(processed_df)} records)")
    return processed_df

if __name__ == "__main__":
    raw_path = "backend/data/raw/indian_railways/historical_train_runs.csv"
    out_path = "backend/data/processed/features/unified_train_features.csv"
    build_unified_ml_dataset(raw_path, out_path)
