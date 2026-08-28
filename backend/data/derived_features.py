import pandas as pd
import numpy as np

class DerivedDelayFeatures:
    """
    Computes leakage-free groupby average delay features derived strictly from training split data.
    """
    def __init__(self):
        self.train_delay_map = {}
        self.station_delay_map = {}
        self.route_delay_map = {}
        self.hour_delay_map = {}
        self.global_avg_delay = 12.5

    def fit(self, df: pd.DataFrame):
        """Fits groupby delay aggregations on training dataframe strictly to avoid target leakage."""
        if "delay_minutes" in df.columns:
            target_col = "delay_minutes"
        elif "current_delay_minutes" in df.columns:
            target_col = "current_delay_minutes"
        else:
            return

        self.global_avg_delay = float(df[target_col].mean())

        # Train-wise historical delay
        if "train_number" in df.columns:
            self.train_delay_map = df.groupby("train_number")[target_col].mean().to_dict()

        # Station-wise historical delay
        if "station_code" in df.columns:
            self.station_delay_map = df.groupby("station_code")[target_col].mean().to_dict()
        elif "source_station" in df.columns:
            self.station_delay_map = df.groupby("source_station")[target_col].mean().to_dict()

        # Hour-of-day delay
        if "hour_of_day" in df.columns:
            self.hour_delay_map = df.groupby("hour_of_day")[target_col].mean().to_dict()

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Applies fitted aggregations to feature matrix without data leakage."""
        df_out = df.copy()

        train_col = "train_number" if "train_number" in df_out.columns else "train_id"
        station_col = "station_code" if "station_code" in df_out.columns else "source_station"

        df_out["train_avg_delay"] = df_out[train_col].map(self.train_delay_map).fillna(self.global_avg_delay)
        df_out["station_avg_delay"] = df_out[station_col].map(self.station_delay_map).fillna(self.global_avg_delay)
        
        if "hour_of_day" in df_out.columns:
            df_out["hour_avg_delay"] = df_out["hour_of_day"].map(self.hour_delay_map).fillna(self.global_avg_delay)
        else:
            df_out["hour_avg_delay"] = self.global_avg_delay

        df_out["route_avg_delay"] = (df_out["train_avg_delay"] + df_out["station_avg_delay"]) / 2.0
        return df_out

derived_feature_engine = DerivedDelayFeatures()
