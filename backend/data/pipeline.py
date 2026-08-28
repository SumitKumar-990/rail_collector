import os
import sys
import pandas as pd
import numpy as np

# Add data folder to path
data_dir = os.path.dirname(os.path.abspath(__file__))
if data_dir not in sys.path:
    sys.path.insert(0, data_dir)

from station_master import station_master
from ingest_kaggle_delay_dataset import load_or_simulate_kaggle_dataset
from fetch_open_meteo_weather import fetch_open_meteo_weather
from derived_features import derived_feature_engine

def run_5_part_sih_data_pipeline() -> pd.DataFrame:
    """
    Executes the complete 5-part SIH data integration pipeline:
    1. Ingests Kaggle Indian Railway Delay Dataset (vishwassrivastava1/indian-railway-delay-dataset)
    2. Resolves route & station sequences
    3. Merges Station Master coordinates (stations.json GeoJSON)
    4. Connects Open-Meteo Historical Weather API (rainfall & temperature by station coordinates)
    5. Calculates leakage-free Derived Delay Features (groupby aggregations)
    """
    print("\n=======================================================")
    print("   RUNNING 5-PART SIH DATA INTEGRATION PIPELINE        ")
    print("=======================================================")

    # 1. Historical Delay Data (Kaggle Dataset)
    kaggle_csv = os.path.join(data_dir, "raw", "indian_railways", "indian_railway_delay_dataset.csv")
    df = load_or_simulate_kaggle_dataset(kaggle_csv)
    print(f"[STAGE 1] Ingested Historical Delay Data ({len(df)} records)")

    # 2 & 3. Station Master Coordinates & Zones (GeoJSON)
    lats, lngs, zones, states = [], [], [], []
    station_cols = df["source_station"] if "source_station" in df.columns else df["station_code"]

    for code in station_cols:
        st = station_master.get_station(code)
        lats.append(st["latitude"])
        lngs.append(st["longitude"])
        zones.append(st["zone"])
        states.append(st["state"])

    df["latitude"] = lats
    df["longitude"] = lngs
    df["zone"] = zones
    df["state"] = states
    print("[STAGE 2 & 3] Station Master GeoJSON Coordinates & Zones Merged")

    # 4. Open-Meteo Weather API Integration (Pre-fetching unique station weather)
    unique_stations = df["source_station"].unique() if "source_station" in df.columns else df["station_code"].unique()
    weather_map = {}
    for st_code in unique_stations:
        weather_map[st_code] = fetch_open_meteo_weather(st_code)

    df["weather_score"] = station_cols.map(lambda c: weather_map.get(c, {}).get("weather_score", 0.11))
    df["rainfall_mm"] = station_cols.map(lambda c: weather_map.get(c, {}).get("rainfall_mm", 4.5))
    print(f"[STAGE 4] Open-Meteo Historical Weather API Connected for {len(unique_stations)} Station Master Nodes")

    # 5. Derived Delay Features (Leakage-free Groupby)
    derived_feature_engine.fit(df)
    df = derived_feature_engine.transform(df)
    print("[STAGE 5] Leakage-Free Derived Delay Features Calculated")

    output_csv = os.path.join(data_dir, "processed", "features", "sih_integrated_features.csv")
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    df.to_csv(output_csv, index=False)
    print(f"\n[OK] Pipeline completed! Integrated dataset saved to:\n     {output_csv}")
    print("=======================================================\n")
    return df

if __name__ == "__main__":
    run_5_part_sih_data_pipeline()
