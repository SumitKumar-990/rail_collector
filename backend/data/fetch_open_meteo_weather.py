import os
import json
import urllib.request
from datetime import datetime, timedelta
from station_master import station_master

_WEATHER_CACHE = {}

def fetch_open_meteo_weather(station_code: str, target_date: str = None) -> dict:
    """
    Fetches daily weather parameters (rainfall mm, temperature °C, weather score)
    from Open-Meteo Free Historical Weather API for station coordinates.
    Uses in-memory cache to avoid duplicate HTTP requests across large datasets.
    """
    lat, lng = station_master.get_coordinates(station_code)
    
    if target_date is None:
        target_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    cache_key = f"{station_code}_{target_date}"
    if cache_key in _WEATHER_CACHE:
        return _WEATHER_CACHE[cache_key]

    url = (f"https://archive-api.open-meteo.com/v1/archive?"
           f"latitude={lat:.4f}&longitude={lng:.4f}&"
           f"start_date={target_date}&end_date={target_date}&"
           f"daily=rain_sum,temperature_2m_mean&timezone=auto")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=2) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                daily = data.get("daily", {})
                rain_list = daily.get("rain_sum", [0.0])
                temp_list = daily.get("temperature_2m_mean", [28.0])

                rainfall_mm = rain_list[0] if rain_list and rain_list[0] is not None else 0.0
                temp_c = temp_list[0] if temp_list and temp_list[0] is not None else 28.0

                weather_score = min(1.0, rainfall_mm / 40.0)

                res = {
                    "station_code": station_code,
                    "latitude": lat,
                    "longitude": lng,
                    "date": target_date,
                    "rainfall_mm": float(round(rainfall_mm, 1)),
                    "temperature_celsius": float(round(temp_c, 1)),
                    "weather_score": float(round(weather_score, 2)),
                    "provider": "Open-Meteo Historical Weather API (Free)"
                }
                _WEATHER_CACHE[cache_key] = res
                return res
    except Exception as e:
        pass

    # Fallback
    res = {
        "station_code": station_code,
        "latitude": lat,
        "longitude": lng,
        "date": target_date,
        "rainfall_mm": 4.5,
        "temperature_celsius": 27.5,
        "weather_score": 0.11,
        "provider": "Open-Meteo Offline Fallback"
    }
    _WEATHER_CACHE[cache_key] = res
    return res
