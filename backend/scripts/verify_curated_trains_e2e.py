import os
import sys
import random
import json

backend_dir = r"c:\Users\SaDSBKGDatyam singh\OneDrive\Desktop\SIH\backend"
root_dir = r"c:\Users\SaDSBKGDatyam singh\OneDrive\Desktop\SIH"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from services.train_directory_db import train_directory_db

client = TestClient(app)

print("=" * 70)
print("RUNNING END-TO-END VERIFICATION ON 20 RANDOM CURATED TRAINS")
print("=" * 70)

# Step 1: Check stats endpoint
stats_res = client.get("/api/trains/stats")
assert stats_res.status_code == 200, f"Stats endpoint failed: {stats_res.text}"
stats_data = stats_res.json()
total_trains = stats_data.get("total_trains", 0)
print(f"[OK] Curated Directory Stats: {total_trains} total trains available in database.")
print(f"     Categories breakdown: {stats_data.get('categories')}")
assert total_trains >= 1000, f"Expected at least 1000 trains, got {total_trains}"

# Step 2: Query all trains from database and select 20 diverse random trains
all_trains = train_directory_db.search_trains("", limit=2000)
assert len(all_trains) >= 20, "Not enough trains to sample"

random.seed(42)
sampled_trains = random.sample(all_trains, 20)

passed_count = 0

print(f"\n--- Testing 20 Sampled Trains (Database -> Search API -> Details -> Schedule -> Live Fallback) ---")
for i, train in enumerate(sampled_trains, 1):
    t_num = train["train_number"]
    t_name = train["train_name"]
    src = train["source_name"]
    dst = train["destination_name"]

    # 1. Search API Test (User types train number)
    search_res = client.get(f"/api/trains/search?q={t_num}")
    assert search_res.status_code == 200, f"Search failed for {t_num}"
    matches = search_res.json()["trains"]
    found = any(m["train_number"] == t_num for m in matches)
    assert found, f"Train {t_num} not found in search results"

    # 2. Details API Test (User selects train)
    details_res = client.get(f"/api/trains/{t_num}")
    assert details_res.status_code == 200, f"Details failed for {t_num}"
    details = details_res.json()
    assert details["train_number"] == t_num, f"Train number mismatch: expected {t_num}, got {details['train_number']}"
    assert details["train_name"], f"Train name missing for {t_num}"

    # 3. Schedule API Test (Expandable journey timeline)
    sched_res = client.get(f"/api/trains/{t_num}/schedule")
    assert sched_res.status_code == 200, f"Schedule failed for {t_num}"
    sched = sched_res.json()
    stations_count = len(sched.get("stations", []))
    assert stations_count > 0, f"Train {t_num} has 0 stops in timetable"

    # 4. Live API Test (Check live tracking or graceful static fallback)
    live_res = client.get(f"/api/trains/{t_num}/live")
    assert live_res.status_code == 200, f"Live status failed for {t_num}"
    live = live_res.json()
    assert live["train_number"] == t_num, f"Live train number mismatch"

    status_tag = "LIVE" if live.get("is_live_available") else "STATIC (Timetable Mode)"

    print(f"[{i:02d}/20 PASS] Train {t_num:>5}: {t_name:<30} | {src} -> {dst} | {stations_count} stops | Status: {status_tag}")
    passed_count += 1

print("\n" + "=" * 70)
print(f"SUCCESS: ALL {passed_count}/20 RANDOM CURATED TRAINS VERIFIED END-TO-END!")
print("=" * 70)
