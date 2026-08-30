import sys
import os

backend_dir = r"c:\Users\SaDSBKGDatyam singh\OneDrive\Desktop\SIH\backend"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from services.train_directory_db import train_directory_db

print("=== 1. SEARCH '12019' ===")
res1 = train_directory_db.search_trains("12019")
for r in res1:
    print(f"  {r['train_number']}: {r['train_name']} ({r['source_name']} -> {r['destination_name']})")

print("\n=== 2. SEARCH '1201' ===")
res2 = train_directory_db.search_trains("1201", limit=6)
for r in res2:
    print(f"  {r['train_number']}: {r['train_name']}")

print("\n=== 3. SEARCH 'Rajdhani' ===")
res3 = train_directory_db.search_trains("Rajdhani", limit=6)
for r in res3:
    print(f"  {r['train_number']}: {r['train_name']}")

print("\n=== 4. SEARCH 'Express' ===")
res4 = train_directory_db.search_trains("Express", limit=6)
for r in res4:
    print(f"  {r['train_number']}: {r['train_name']}")

print("\n=== 5. GET SCHEDULE FOR 12555 (Gorakhdham) ===")
sched = train_directory_db.get_train_schedule("12555")
print(f"Train: {sched['train_number']} - {sched['train_name']}, Total stops: {len(sched['stations'])}")
for s in sched['stations'][:3]:
    print(f"  Stop {s['sequence']}: {s['station_name']} ({s['station_code']}) Arr:{s['scheduled_arrival']} Dep:{s['scheduled_departure']}")

print("\n=== 6. TRAINS BETWEEN HWH -> RNC ===")
between = train_directory_db.get_trains_between("HWH", "RNC")
for b in between:
    print(f"  {b['train_number']}: {b['train_name']} ({b['departure_time']} -> {b['arrival_time']})")
