import os
import sys
import json

backend_dir = r"c:\Users\SaDSBKGDatyam singh\OneDrive\Desktop\SIH\backend"
root_dir = r"c:\Users\SaDSBKGDatyam singh\OneDrive\Desktop\SIH"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Load .env
env_file = os.path.join(root_dir, ".env")
if os.path.exists(env_file):
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ[k.strip()] = v.strip()

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("=" * 60)
print("RUNNING 7 ACCEPTANCE TESTS FOR FULL TRAIN DIRECTORY INTEGRATION")
print("=" * 60)

# TEST 1: Search 12019
res1 = client.get("/api/trains/search?q=12019")
assert res1.status_code == 200, f"Failed: {res1.text}"
data1 = res1.json()["trains"]
print(f"[TEST 1 PASS] Search '12019': Found {len(data1)} train(s) -> {data1[0]['train_number']} {data1[0]['train_name']}")
assert any(t["train_number"] == "12019" for t in data1), "12019 must be in search results"

# TEST 2: Search 1201
res2 = client.get("/api/trains/search?q=1201&limit=10")
assert res2.status_code == 200
data2 = res2.json()["trains"]
print(f"[TEST 2 PASS] Search '1201': Found {len(data2)} trains -> {[t['train_number'] for t in data2[:5]]}")
assert len(data2) >= 2, "Partial number search '1201' must return multiple trains"

# TEST 3: Search Rajdhani
res3 = client.get("/api/trains/search?q=Rajdhani&limit=10")
assert res3.status_code == 200
data3 = res3.json()["trains"]
print(f"[TEST 3 PASS] Search 'Rajdhani': Found {len(data3)} Rajdhani trains -> {[t['train_number'] + ' ' + t['train_name'] for t in data3[:4]]}")
assert len(data3) >= 1, "Must return Rajdhani trains"

# TEST 4: Search Express
res4 = client.get("/api/trains/search?q=Express&limit=15")
assert res4.status_code == 200
data4 = res4.json()["trains"]
print(f"[TEST 4 PASS] Search 'Express': Found {len(data4)} Express trains -> {[t['train_number'] for t in data4[:5]]}")
assert len(data4) >= 5, "Must return multiple Express trains"

# TEST 5: Select a train outside popular cards (e.g. 12555 Gorakhdham or 11019 Konark)
train_no = "12555"
res5_info = client.get(f"/api/trains/{train_no}")
assert res5_info.status_code == 200
t5_info = res5_info.json()
print(f"[TEST 5 PASS] Train details for {train_no}: {t5_info['train_name']} ({t5_info['source_station_name']} -> {t5_info['destination_station_name']}), stops: {len(t5_info.get('stations', []))}")
assert t5_info["train_number"] == train_no, f"Expected {train_no}"

res5_sched = client.get(f"/api/trains/{train_no}/schedule")
assert res5_sched.status_code == 200
sched5 = res5_sched.json()
print(f"             Schedule stops returned: {len(sched5.get('stations', []))} stations")
assert len(sched5.get("stations", [])) > 0, "Schedule stops must not be empty"

# TEST 6: Static fallback when live tracking is unavailable
res6_live = client.get(f"/api/trains/{train_no}/live")
assert res6_live.status_code == 200
live6 = res6_live.json()
print(f"[TEST 6 PASS] Live endpoint response for un-tracked train {train_no}: is_live_available={live6.get('is_live_available')}, status={live6.get('running_status')}")
if not live6.get("is_live_available"):
    print(f"             Advisory message: '{live6.get('status_message')}'")
    assert "Live tracking is currently unavailable" in live6.get("status_message", "")

# TEST 7: Between stations query with complete directory
res7 = client.get("/api/trains/between?from=HWH&to=RNC")
assert res7.status_code == 200
b_trains = res7.json()["trains"]
print(f"[TEST 7 PASS] Between stations HWH -> RNC: Found {len(b_trains)} trains -> {[t['train_number'] for t in b_trains]}")
assert len(b_trains) >= 2, "Should find multiple connecting trains"

print("=" * 60)
print("ALL 7 ACCEPTANCE TESTS PASSED SUCCESSFULLY!")
print("=" * 60)
