import os
import sys
import sqlite3
import csv
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("CuratedTrainDirectory")
logging.basicConfig(level=logging.INFO)

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BACKEND_DIR, "data")
CURATED_DIR = os.path.join(DATA_DIR, "curated_train_directory")
DB_PATH = os.path.join(DATA_DIR, "train_directory.db")
CSV_PATH = os.path.join(DATA_DIR, "Train_details_22122017.csv")
CURATED_JSON_PATH = os.path.join(CURATED_DIR, "curated_trains.json")

os.makedirs(CURATED_DIR, exist_ok=True)

def normalize_text(text: Optional[str]) -> str:
    if not text:
        return ""
    return text.strip().strip("'\"").strip()

def clean_train_name(name: str) -> str:
    name = normalize_text(name).upper()
    # Format common abbreviations
    replacements = [
        ("EXP", "EXPRESS"),
        ("SF", "SUPERFAST"),
        ("SPL", "SPECIAL"),
        ("RAJ", "RAJDHANI"),
        ("SHA", "SHATABDI"),
        ("SHATABDI EXP", "SHATABDI EXPRESS"),
        ("RAJDHANI EXP", "RAJDHANI EXPRESS"),
        ("DURONTO EXP", "DURONTO EXPRESS"),
        ("MAIL", "MAIL"),
        ("JAN SHATABDI", "JAN SHATABDI EXPRESS")
    ]
    for old, new in replacements:
        if name.endswith(" " + old):
            name = name[:-len(old)] + new
    # Clean up and title case nicely
    words = name.split()
    clean_words = []
    for w in words:
        if w in ["EXPRESS", "SUPERFAST", "SPECIAL", "RAJDHANI", "SHATABDI", "DURONTO", "MAIL", "VANDE", "BHARAT", "GARIB", "RATH", "JAN"]:
            clean_words.append(w.title())
        elif "-" in w:
            parts = w.split("-")
            clean_words.append("-".join([p.upper() if len(p) <= 4 else p.title() for p in parts]))
        elif len(w) <= 4:
            clean_words.append(w.upper())
        else:
            clean_words.append(w.title())
    return " ".join(clean_words)

def infer_train_type(name: str) -> str:
    name_upper = name.upper()
    if "RAJ" in name_upper or "RAJDHANI" in name_upper:
        return "Rajdhani Express"
    if "SHATABDI" in name_upper:
        return "Shatabdi Express"
    if "VANDE" in name_upper:
        return "Vande Bharat"
    if "DURONTO" in name_upper:
        return "Duronto Express"
    if "GARIB" in name_upper or "RATH" in name_upper:
        return "Garib Rath"
    if "JAN SHATABDI" in name_upper or "JANSHATABDI" in name_upper:
        return "Jan Shatabdi"
    if "SUPERFAST" in name_upper or "SF" in name_upper:
        return "Superfast Express"
    if "MAIL" in name_upper:
        return "Mail"
    if "PASS" in name_upper or "PASSENGER" in name_upper:
        return "Passenger"
    return "Express"

def build_curated_directory():
    """
    Selects ~1,500 diverse Indian Railways trains covering:
    - All Rajdhani, Shatabdi, Duronto, Vande Bharat, Tejas trains
    - Premier Superfast and Mail trains connecting major metros (Delhi, Mumbai, Kolkata, Chennai, Bangalore, Hyderabad, Ahmedabad, Pune, Patna, Lucknow, Guwahati, Kochi, Jaipur)
    - Major cross-country express routes across North, South, East, West, Central and North-East India.
    """
    if not os.path.exists(CSV_PATH):
        logger.error(f"CSV file missing at {CSV_PATH}")
        return

    logger.info("Reading CSV dataset...")
    all_trains = {}
    train_stops = {}

    with open(CSV_PATH, mode="r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_t_no = normalize_text(row.get("Train No", "")).lstrip("'").strip()
            if not raw_t_no:
                continue

            t_name = normalize_text(row.get("Train Name", ""))
            seq_str = normalize_text(row.get("SEQ", "1"))
            try:
                seq = int(seq_str)
            except ValueError:
                seq = 1

            st_code = normalize_text(row.get("Station Code", "")).upper()
            st_name = normalize_text(row.get("Station Name", "")).title()
            arr_time = normalize_text(row.get("Arrival time", "00:00:00"))[:5]
            dep_time = normalize_text(row.get("Departure Time", "00:00:00"))[:5]
            
            dist_str = normalize_text(row.get("Distance", "0"))
            try:
                dist = float(dist_str)
            except ValueError:
                dist = 0.0

            src_code = normalize_text(row.get("Source Station", "")).upper()
            src_name = normalize_text(row.get("Source Station Name", "")).title()
            dst_code = normalize_text(row.get("Destination Station", "")).upper()
            dst_name = normalize_text(row.get("Destination Station Name", "")).title()

            if raw_t_no not in all_trains:
                all_trains[raw_t_no] = {
                    "train_number": raw_t_no,
                    "raw_name": t_name,
                    "train_name": clean_train_name(t_name),
                    "train_type": infer_train_type(t_name),
                    "source_code": src_code or st_code,
                    "source_name": src_name or st_name,
                    "destination_code": dst_code or st_code,
                    "destination_name": dst_name or st_name,
                    "departure_time": dep_time if seq == 1 else "06:00",
                    "arrival_time": arr_time,
                    "total_distance_km": dist,
                    "total_stops": 1,
                    "max_seq": seq
                }
                train_stops[raw_t_no] = []
            else:
                t_obj = all_trains[raw_t_no]
                t_obj["total_stops"] += 1
                if dist > t_obj["total_distance_km"]:
                    t_obj["total_distance_km"] = dist
                if seq == 1:
                    t_obj["departure_time"] = dep_time
                if seq >= t_obj["max_seq"]:
                    t_obj["max_seq"] = seq
                    t_obj["arrival_time"] = arr_time
                    if not t_obj["destination_code"]:
                        t_obj["destination_code"] = dst_code or st_code
                        t_obj["destination_name"] = dst_name or st_name

            train_stops[raw_t_no].append({
                "sequence": seq,
                "station_code": st_code,
                "station_name": st_name,
                "scheduled_arrival": arr_time if arr_time != "00:00" else "--",
                "scheduled_departure": dep_time if dep_time != "00:00" else "--",
                "distance_km": dist
            })

    # Curation Strategy to pick ~1,500 diverse trains
    curated_keys = set()

    # Priority 1: All Rajdhani, Shatabdi, Duronto, Vande Bharat, Garib Rath, Jan Shatabdi
    for t_no, t_info in all_trains.items():
        t_type = t_info["train_type"]
        if t_type in ["Rajdhani Express", "Shatabdi Express", "Duronto Express", "Vande Bharat", "Garib Rath", "Jan Shatabdi"]:
            curated_keys.add(t_no)

    # Priority 2: Key Metro Hub Stations
    metro_stations = {
        "NDLS", "HWH", "SDAH", "CSMT", "MMCT", "BCT", "MAS", "SBC", "YPR", "SC", "HYB",
        "ADI", "PUNE", "PNBE", "LKO", "CNB", "GHY", "ERS", "TVC", "JP", "BSB", "DGR",
        "ASN", "DHN", "RNC", "BKN", "GKP", "ASR", "JAT", "BPL", "RKMP", "NGP", "VSKP"
    }

    for t_no, t_info in all_trains.items():
        if len(curated_keys) >= 1500:
            break
        src = t_info["source_code"]
        dst = t_info["destination_code"]
        if (src in metro_stations or dst in metro_stations) and t_info["total_stops"] >= 3:
            curated_keys.add(t_no)

    # Priority 3: Long Distance & Superfast Trains (Total Distance > 400 km)
    for t_no, t_info in all_trains.items():
        if len(curated_keys) >= 1500:
            break
        if t_info["total_distance_km"] >= 400 and t_info["total_stops"] >= 4:
            curated_keys.add(t_no)

    # Priority 4: Fill remaining diverse trains up to ~1,500
    for t_no, t_info in all_trains.items():
        if len(curated_keys) >= 1500:
            break
        if t_info["total_stops"] >= 2:
            curated_keys.add(t_no)

    logger.info(f"Curated {len(curated_keys)} high-quality trains.")

    curated_trains = {k: all_trains[k] for k in curated_keys}
    curated_stops_map = {k: sorted(train_stops[k], key=lambda s: s["sequence"]) for k in curated_keys}

    # Save to JSON artifact
    with open(CURATED_JSON_PATH, mode="w", encoding="utf-8") as f:
        json.dump({
            "total_trains": len(curated_trains),
            "generated_at": "2026-08-31T00:30:00Z",
            "trains": list(curated_trains.values())
        }, f, indent=2)

    logger.info(f"Saved curated JSON to {CURATED_JSON_PATH}")

    # Populate SQLite database with curated trains
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("DROP TABLE IF EXISTS trains")
    cursor.execute("DROP TABLE IF EXISTS train_stations")

    cursor.execute("""
        CREATE TABLE trains (
            train_number TEXT PRIMARY KEY,
            train_name TEXT,
            train_type TEXT,
            source_code TEXT,
            source_name TEXT,
            destination_code TEXT,
            destination_name TEXT,
            departure_time TEXT,
            arrival_time TEXT,
            total_distance_km REAL,
            total_stops INTEGER
        )
    """)

    cursor.execute("""
        CREATE TABLE train_stations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            train_number TEXT,
            station_seq INTEGER,
            station_code TEXT,
            station_name TEXT,
            arrival_time TEXT,
            departure_time TEXT,
            distance_km REAL,
            FOREIGN KEY (train_number) REFERENCES trains(train_number)
        )
    """)

    cursor.execute("CREATE INDEX idx_trains_number ON trains(train_number)")
    cursor.execute("CREATE INDEX idx_trains_name ON trains(train_name)")
    cursor.execute("CREATE INDEX idx_trains_src ON trains(source_code)")
    cursor.execute("CREATE INDEX idx_trains_dst ON trains(destination_code)")
    cursor.execute("CREATE INDEX idx_ts_train_seq ON train_stations(train_number, station_seq)")
    cursor.execute("CREATE INDEX idx_ts_station ON train_stations(station_code)")

    train_rows = [
        (
            t["train_number"],
            t["train_name"],
            t["train_type"],
            t["source_code"],
            t["source_name"],
            t["destination_code"],
            t["destination_name"],
            t["departure_time"],
            t["arrival_time"],
            t["total_distance_km"],
            t["total_stops"]
        )
        for t in curated_trains.values()
    ]

    cursor.executemany("""
        INSERT INTO trains (
            train_number, train_name, train_type, source_code, source_name,
            destination_code, destination_name, departure_time, arrival_time,
            total_distance_km, total_stops
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, train_rows)

    station_rows = []
    for t_no, stops in curated_stops_map.items():
        for s in stops:
            station_rows.append((
                t_no,
                s["sequence"],
                s["station_code"],
                s["station_name"],
                s["scheduled_arrival"],
                s["scheduled_departure"],
                s["distance_km"]
            ))

    chunk_size = 5000
    for i in range(0, len(station_rows), chunk_size):
        chunk = station_rows[i:i + chunk_size]
        cursor.executemany("""
            INSERT INTO train_stations (
                train_number, station_seq, station_code, station_name,
                arrival_time, departure_time, distance_km
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, chunk)

    conn.commit()
    conn.close()
    logger.info(f"Successfully populated {len(train_rows)} curated trains and {len(station_rows)} stops in SQLite database!")
    return len(curated_trains)

if __name__ == "__main__":
    build_curated_directory()
