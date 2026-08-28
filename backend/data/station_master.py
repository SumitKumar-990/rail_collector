import os
import json
import math

class StationMaster:
    def __init__(self, json_path: str = None):
        if json_path is None:
            json_path = os.path.join(os.path.dirname(__file__), "stations.json")
        self.stations = {}
        self.load_stations(json_path)

    def load_stations(self, json_path: str):
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for feature in data.get("features", []):
                    props = feature.get("properties", {})
                    geom = feature.get("geometry", {})
                    coords = geom.get("coordinates", [0.0, 0.0]) # [lng, lat]
                    code = props.get("code")
                    if code:
                        self.stations[code] = {
                            "code": code,
                            "name": props.get("name"),
                            "zone": props.get("zone"),
                            "state": props.get("state"),
                            "address": props.get("address"),
                            "latitude": coords[1],
                            "longitude": coords[0]
                        }

    def get_station(self, station_code: str) -> dict:
        return self.stations.get(station_code, {
            "code": station_code,
            "name": station_code,
            "zone": "NR",
            "state": "India",
            "latitude": 26.0,
            "longitude": 80.0
        })

    def get_coordinates(self, station_code: str) -> tuple:
        st = self.get_station(station_code)
        return (st["latitude"], st["longitude"])

    def calculate_haversine_distance(self, code_a: str, code_b: str) -> float:
        lat1, lon1 = self.get_coordinates(code_a)
        lat2, lon2 = self.get_coordinates(code_b)

        R = 6371.0 # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(R * c, 2)

station_master = StationMaster()
