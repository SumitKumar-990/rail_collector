import os
import json
import pandas as pd

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def load_station_master_data(filepath: str = None) -> dict:
    """
    Loads Station Master GeoJSON dataset (stations.json).
    Returns a dictionary mapping station_code -> {name, zone, state, latitude, longitude}.
    """
    if filepath is None:
        filepath = os.path.join(DATA_DIR, "stations.json")

    if not os.path.exists(filepath):
        print(f"[WARN] stations.json not found at {filepath}")
        return {}

    with open(filepath, "r", encoding="utf-8") as f:
        geojson = json.load(f)

    station_dict = {}
    for feature in geojson.get("features", []):
        props = feature.get("properties", {})
        geom = feature.get("geometry", {})
        coords = geom.get("coordinates", [80.0, 26.0]) # [lng, lat]
        
        code = props.get("code")
        if code:
            station_dict[code] = {
                "code": code,
                "name": props.get("name", code),
                "zone": props.get("zone", "NR"),
                "state": props.get("state", "India"),
                "longitude": float(coords[0]),
                "latitude": float(coords[1])
            }

    print(f"[OK] Loaded Station Master Data: {len(station_dict)} station nodes from GeoJSON")
    return station_dict

def load_station_df(filepath: str = None) -> pd.DataFrame:
    """Returns Station Master as a Pandas DataFrame."""
    station_dict = load_station_master_data(filepath)
    return pd.DataFrame(list(station_dict.values()))
