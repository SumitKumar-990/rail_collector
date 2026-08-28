# RailSight AI - Model Evaluation & Leakage Audit Report

## 1. Dataset & Split Specifications

* **Total Dataset Size**: 2500 records
* **Total Unique Train Journeys**: 253 journeys
* **Training Journeys Count**: 203 journeys (2011 snapshot samples)
* **Testing Journeys Count**: 50 journeys (489 snapshot samples)
* **Split Strategy**: `JOURNEY_AWARE_RUN_SPLIT (No Journey Overlap)` (No snapshot rows from the same journey appear in both train and test splits)
* **Target Definition**: `remaining_travel_time_minutes` (Actual remaining journey travel time in minutes from prediction timestamp $t$)

---

## 2. Model Performance & Comparative Benchmark

| Model | MAE (Average ETA Error) | RMSE | R² Score | Performance Rank |
| :--- | ---: | ---: | ---: | :--- |
| **Model 1: Schedule Baseline** | **11.17 mins** | 15.10 mins | 0.9965 | Deterministic Baseline |
| **Model 2: Random Forest Regressor** | **7.73 mins** | 10.19 mins | 0.9984 | Machine Learning Baseline |
| **Model 3: XGBoost Regressor (Primary)** | **6.91 mins** | 9.41 mins | 0.9986 | **Primary Production Model** |

> [!NOTE]
> The primary metric for SIH evaluation is **MAE (Mean Absolute Error in minutes)**. 
> An Average ETA Error of **6.91 minutes** indicates high operational accuracy without data leakage.

---

## 3. Data Leakage Audit & Feature Availability Verification

| Feature | Available at Prediction Timestamp $t$? | Used in Model? | Leakage Risk Status |
| :--- | :---: | :---: | :--- |
| `current_delay_minutes` | Yes | Yes | ✅ PASSED (Available at runtime) |
| `current_speed_kmph` | Yes | Yes | ✅ PASSED (Live telemetry / estimated position) |
| `distance_remaining_km` | Yes | Yes | ✅ PASSED (Route spatial calculation) |
| `scheduled_remaining_time_minutes` | Yes | Yes | ✅ PASSED (Timetable schedule calculation) |
| `historical_avg_delay_minutes` | Yes | Yes | ✅ PASSED (Computed strictly from training set) |
| `station_avg_delay_minutes` | Yes | Yes | ✅ PASSED (Computed strictly from training set) |
| `route_avg_delay_minutes` | Yes | Yes | ✅ PASSED (Corridor delay history) |
| `weather_score` / `rainfall_mm` | Yes | Yes | ✅ PASSED (Station weather API / baseline) |
| `congestion_score` | Yes | Yes | ✅ PASSED (Derived from pre-prediction section density) |
| `speed_restriction_score` | Yes | Yes | ✅ PASSED (Caution order TSR cap) |
| `signal_delay_score` | Yes | Yes | ✅ PASSED (Signal interlock status) |
| **Target Actual Arrival Time** | **No** | **No** | 🚫 EXCLUDED FROM FEATURES (Used only as Target $y$) |
| **Final Journey Delay** | **No** | **No** | 🚫 EXCLUDED FROM FEATURES (Future observation) |
| **Future Station Telemetry** | **No** | **No** | 🚫 EXCLUDED FROM FEATURES (Future observation) |

---

## 4. Input Feature List
```json
[
  "current_delay_minutes",
  "current_speed_kmph",
  "distance_to_next_station_km",
  "distance_remaining_km",
  "scheduled_remaining_time_minutes",
  "historical_avg_delay_minutes",
  "station_avg_delay_minutes",
  "route_avg_delay_minutes",
  "hour_of_day",
  "day_of_week",
  "month",
  "weather_score",
  "rainfall_mm",
  "congestion_score",
  "speed_restriction_score",
  "signal_delay_score",
  "previous_station_delay",
  "upcoming_station_count"
]
```
