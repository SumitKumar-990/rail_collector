import os
import sys
import json
import pandas as pd
import numpy as np

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb


def train_and_evaluate_models():
    """
    Trains Baseline Schedule, Random Forest, and XGBoost Regressor models.
    Prints performance metrics (MAE, RMSE, R²) and saves backend/models/eta_xgboost.json.
    """
    processed_file = "backend/data/processed/features/unified_train_features.csv"
    if not os.path.exists(processed_file):
        print("Generating data first...")
        from data.ingestion import generate_indian_railways_raw_data
        from data.transformation import build_unified_ml_dataset
        raw_path = "backend/data/raw/indian_railways/historical_train_runs.csv"
        df_raw = generate_indian_railways_raw_data(2500)
        os.makedirs("backend/data/raw/indian_railways", exist_ok=True)
        df_raw.to_csv(raw_path, index=False)
        df = build_unified_ml_dataset(raw_path, processed_file)
    else:
        df = pd.read_csv(processed_file)

    feature_cols = [
        "current_delay_minutes", "current_speed_kmph",
        "distance_to_next_station_km", "distance_remaining_km",
        "scheduled_remaining_time_minutes", "historical_avg_delay_minutes",
        "station_avg_delay_minutes", "route_avg_delay_minutes",
        "hour_of_day", "day_of_week", "month", "weather_score", "rainfall_mm",
        "congestion_score", "speed_restriction_score", "signal_delay_score",
        "previous_station_delay", "upcoming_station_count"
    ]

    target_col = "remaining_travel_time_minutes"

    X = df[feature_cols]
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # -------------------------------------------------------------
    # MODEL 1: SCHEDULE BASELINE (Traditional Delay-based ETA)
    # Traditional Remaining = Scheduled Remaining + Current Delay
    # -------------------------------------------------------------
    y_pred_baseline = X_test["scheduled_remaining_time_minutes"] + (X_test["current_delay_minutes"] * 0.7)
    mae_base = mean_absolute_error(y_test, y_pred_baseline)
    rmse_base = np.sqrt(mean_squared_error(y_test, y_pred_baseline))
    r2_base = r2_score(y_test, y_pred_baseline)

    # -------------------------------------------------------------
    # MODEL 2: RANDOM FOREST REGRESSOR
    # -------------------------------------------------------------
    rf_model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)
    rf_model.fit(X_train, y_train)
    y_pred_rf = rf_model.predict(X_test)

    mae_rf = mean_absolute_error(y_test, y_pred_rf)
    rmse_rf = np.sqrt(mean_squared_error(y_test, y_pred_rf))
    r2_rf = r2_score(y_test, y_pred_rf)

    # -------------------------------------------------------------
    # MODEL 3: XGBOOST REGRESSOR (Primary Production Model)
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
    print("=======================================================\n")

    # Save Model Artifacts
    models_dir = "backend/models"
    os.makedirs(models_dir, exist_ok=True)
    model_path = os.path.join(models_dir, "eta_xgboost.json")
    xgb_model.save_model(model_path)
    
    # Save Metadata & Feature Names
    meta_path = os.path.join(models_dir, "model_metadata.json")
    meta = {
        "model_type": "XGBoost Regressor",
        "feature_names": feature_cols,
        "metrics": {
            "schedule_baseline": {"mae": round(mae_base, 2), "rmse": round(rmse_base, 2), "r2": round(r2_base, 4)},
            "random_forest": {"mae": round(mae_rf, 2), "rmse": round(rmse_rf, 2), "r2": round(r2_rf, 4)},
            "xgboost": {"mae": round(mae_xgb, 2), "rmse": round(rmse_xgb, 2), "r2": round(r2_xgb, 4)}
        },
        "trained_at": pd.Timestamp.now().isoformat()
    }
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"[OK] Saved trained XGBoost model to {model_path}")
    print(f"[OK] Saved model metadata to {meta_path}")


if __name__ == "__main__":
    train_and_evaluate_models()
