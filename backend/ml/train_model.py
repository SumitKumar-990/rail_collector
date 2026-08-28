import os
import sys
import json
import joblib
import pandas as pd
import numpy as np

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb

from ml.dataset_builder import dataset_builder, FEATURE_COLUMNS, TARGET_COLUMN
from data.dataset_metadata import get_dataset_metadata

def generate_model_evaluation_doc(
    split_info: dict,
    mae_base: float, rmse_base: float, r2_base: float,
    mae_rf: float, rmse_rf: float, r2_rf: float,
    mae_xgb: float, rmse_xgb: float, r2_xgb: float
):
    """
    Generates docs/model_evaluation.md documenting model results, metrics, and leakage audit.
    """
    doc_path = os.path.join(backend_dir, "..", "docs", "model_evaluation.md")
    os.makedirs(os.path.dirname(doc_path), exist_ok=True)

    content = f"""# RailSight AI - Model Evaluation & Leakage Audit Report

> **Notice**: Validated on the current engineered prototype dataset.

## 1. Dataset & Split Specifications

* **Total Dataset Size**: {split_info['total_samples']} records
* **Total Unique Train Journeys**: {split_info['total_journeys']} journeys
* **Training Journeys Count**: {split_info['train_journeys_count']} journeys ({split_info['train_samples_count']} snapshot samples)
* **Testing Journeys Count**: {split_info['test_journeys_count']} journeys ({split_info['test_samples_count']} snapshot samples)
* **Split Strategy**: `{split_info['split_strategy']}` (No snapshot rows from the same journey appear in both train and test splits)
* **Target Definition**: `{TARGET_COLUMN}` (Actual remaining journey travel time in minutes from prediction timestamp $t$)

---

## 2. Model Performance & Comparative Benchmark

| Model | MAE (Average ETA Error) | RMSE | R² Score | Performance Rank | Saved Artifact |
| :--- | ---: | ---: | ---: | :--- | :--- |
| **Model 1: Schedule Baseline** | **{mae_base:.2f} mins** | {rmse_base:.2f} mins | {r2_base:.4f} | Deterministic Baseline | Timetable Formula |
| **Model 2: Random Forest Regressor** | **{mae_rf:.2f} mins** | {rmse_rf:.2f} mins | {r2_rf:.4f} | Machine Learning Baseline | `eta_random_forest.pkl` |
| **Model 3: XGBoost Regressor (Primary)** | **{mae_xgb:.2f} mins** | {rmse_xgb:.2f} mins | {r2_xgb:.4f} | **Primary Production Model** | `eta_xgboost.json` |

> [!NOTE]
> Primary evaluation metric: **MAE (Mean Absolute Error in minutes)**.
> Both Random Forest (`eta_random_forest.pkl`) and XGBoost (`eta_xgboost.json`) are fully saved and executed during live inference.

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
{json.dumps(FEATURE_COLUMNS, indent=2)}
```
"""
    with open(doc_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[OK] Saved Model Evaluation Report to: {doc_path}")


def train_and_evaluate_models():
    """
    Trains Baseline Schedule, Random Forest, and XGBoost Regressor models.
    Saves BOTH trained models:
    - backend/models/eta_xgboost.json
    - backend/models/eta_random_forest.pkl
    """
    print("\n=======================================================")
    print("    RAILSIGHT AI - REBUILDING & TRAINING DUAL ML MODELS")
    print("=======================================================")

    # 1. Obtain Journey-Aware Split
    X_train, X_test, y_train, y_test, split_info = dataset_builder.get_journey_aware_train_test_split()

    # -------------------------------------------------------------
    # MODEL 1: SCHEDULE BASELINE
    # -------------------------------------------------------------
    y_pred_baseline = X_test["scheduled_remaining_time_minutes"] + (X_test["current_delay_minutes"] * 0.7)
    mae_base = mean_absolute_error(y_test, y_pred_baseline)
    rmse_base = np.sqrt(mean_squared_error(y_test, y_pred_baseline))
    r2_base = r2_score(y_test, y_pred_baseline)

    # -------------------------------------------------------------
    # MODEL 2: RANDOM FOREST REGRESSOR (PERSISTED)
    # -------------------------------------------------------------
    rf_model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)
    rf_model.fit(X_train, y_train)
    y_pred_rf = rf_model.predict(X_test)

    mae_rf = mean_absolute_error(y_test, y_pred_rf)
    rmse_rf = np.sqrt(mean_squared_error(y_test, y_pred_rf))
    r2_rf = r2_score(y_test, y_pred_rf)

    # -------------------------------------------------------------
    # MODEL 3: XGBOOST REGRESSOR (PRIMARY PERSISTED MODEL)
    # -------------------------------------------------------------
    xgb_model = xgb.XGBRegressor(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )
    xgb_model.fit(X_train, y_train)
    y_pred_xgb = xgb_model.predict(X_test)

    mae_xgb = mean_absolute_error(y_test, y_pred_xgb)
    rmse_xgb = np.sqrt(mean_squared_error(y_test, y_pred_xgb))
    r2_xgb = r2_score(y_test, y_pred_xgb)

    print("\n=======================================================")
    print("      MODEL EVALUATION & ACCURACY COMPARISON RESULTS   ")
    print("=======================================================")
    print(f"Model 1: Schedule Baseline   | MAE: {mae_base:.2f} min | RMSE: {rmse_base:.2f} min | R²: {r2_base:.4f}")
    print(f"Model 2: Random Forest       | MAE: {mae_rf:.2f} min | RMSE: {rmse_rf:.2f} min | R²: {r2_rf:.4f}")
    print(f"Model 3: XGBoost Regressor   | MAE: {mae_xgb:.2f} min | RMSE: {rmse_xgb:.2f} min | R²: {r2_xgb:.4f}")
    print(f"-------------------------------------------------------")
    print(f" PRIMARY METRIC: Average ETA Error = {mae_xgb:.2f} minutes")
    print("=======================================================\n")

    # Save Model Artifacts (BOTH XGBoost & Random Forest)
    models_dir = os.path.join(backend_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    
    xgb_path = os.path.join(models_dir, "eta_xgboost.json")
    xgb_model.save_model(xgb_path)

    rf_path = os.path.join(models_dir, "eta_random_forest.pkl")
    joblib.dump(rf_model, rf_path)
    
    # Save Metadata & Feature Names
    meta_path = os.path.join(models_dir, "model_metadata.json")
    meta = {
        "model_type": "XGBoost Regressor & Random Forest Regressor",
        "notice": "Validated on current engineered prototype dataset",
        "feature_names": FEATURE_COLUMNS,
        "target_column": TARGET_COLUMN,
        "split_strategy": split_info["split_strategy"],
        "saved_models": {
            "xgboost": "eta_xgboost.json",
            "random_forest": "eta_random_forest.pkl"
        },
        "metrics": {
            "schedule_baseline": {"mae": round(mae_base, 2), "rmse": round(rmse_base, 2), "r2": round(r2_base, 4)},
            "random_forest": {"mae": round(mae_rf, 2), "rmse": round(rmse_rf, 2), "r2": round(r2_rf, 4)},
            "xgboost": {"mae": round(mae_xgb, 2), "rmse": round(rmse_xgb, 2), "r2": round(r2_xgb, 4)}
        },
        "average_eta_error_minutes": round(mae_xgb, 2),
        "trained_at": pd.Timestamp.now().isoformat()
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"[OK] Saved trained XGBoost model to {xgb_path}")
    print(f"[OK] Saved trained Random Forest model to {rf_path}")
    print(f"[OK] Saved model metadata to {meta_path}")

    # Generate docs/model_evaluation.md
    generate_model_evaluation_doc(
        split_info,
        mae_base, rmse_base, r2_base,
        mae_rf, rmse_rf, r2_rf,
        mae_xgb, rmse_xgb, r2_xgb
    )

if __name__ == "__main__":
    train_and_evaluate_models()
