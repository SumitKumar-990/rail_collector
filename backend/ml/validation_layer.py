from typing import Dict, Any, Tuple, Optional
from backend.data.train_routes_dataset import get_train_route_by_number

VALID_STATUSES = {"NOT_STARTED", "RUNNING", "AT_STATION", "ARRIVED", "CANCELLED", "UNKNOWN"}

class DataValidationLayer:
    """
    Validation Layer for RailSight AI ML ETA Pipeline.
    Strictly verifies train, route, station sequence, distance, and status before inference.
    """

    @staticmethod
    def validate_prediction_input(train_number: str, current_station_code: Optional[str] = None, current_status: str = "RUNNING") -> Tuple[bool, str, Dict[str, Any]]:
        """
        Validates all prerequisites for reliable ML prediction.
        Returns (is_valid, message, metadata).
        """
        # 1. Validate train existence
        train_data = get_train_route_by_number(train_number)
        if not train_data:
            return False, "Insufficient data for reliable prediction: Train not found in dataset", {}

        # 2. Validate route existence & structure
        route = train_data.get("route", [])
        if not route or len(route) < 2:
            return False, "Insufficient data for reliable prediction: Malformed or missing route sequence", {}

        # 3. Validate station sequence ordering
        for i in range(len(route) - 1):
            if route[i]["sequence"] >= route[i + 1]["sequence"]:
                return False, "Insufficient data for reliable prediction: Out-of-order route sequence detected", {}
            if route[i]["distance_from_source"] > route[i + 1]["distance_from_source"]:
                return False, "Insufficient data for reliable prediction: Non-monotonic station distance detected", {}

        # 4. Validate status enum
        status_upper = str(current_status).upper()
        if status_upper not in VALID_STATUSES:
            return False, f"Insufficient data for reliable prediction: Invalid train status '{current_status}'", {}

        # 5. Validate station positioning on route if specified
        current_seq = 1
        if current_station_code:
            found = False
            for st in route:
                if st["station_code"].upper() == current_station_code.upper():
                    current_seq = st["sequence"]
                    found = True
                    break
            if not found:
                return False, f"Insufficient data for reliable prediction: Station '{current_station_code}' does not belong to route", {}

        # 6. Validate positive remaining distance unless journey completed
        last_station = route[-1]
        current_st_obj = route[current_seq - 1]
        distance_remaining = max(0.0, float(last_station["distance_from_source"]) - float(current_st_obj["distance_from_source"]))

        if status_upper != "ARRIVED" and distance_remaining <= 0.0 and current_seq < len(route):
            return False, "Insufficient data for reliable prediction: Invalid distance remaining metric", {}

        return True, "Validation successful", {
            "train_number": train_number,
            "total_stations": len(route),
            "current_sequence": current_seq,
            "distance_remaining_km": distance_remaining,
            "status": status_upper
        }
