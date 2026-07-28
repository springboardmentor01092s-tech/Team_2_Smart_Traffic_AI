import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

MODEL_PATH = os.path.join(os.path.dirname(__file__), "traffic_model.joblib")

# ---------------- GENERATE TRAINING DATA ---------------- #
def generate_training_data(active_nodes: list):
    """
    Generates synthetic historical traffic flows based on active locations.
    """
    records = []
    
    # Generate 14 days of hourly entries
    days = 14
    
    # Default fallback nodes if database is empty during training
    if not active_nodes:
        active_nodes = [
            {"id": 1, "latitude": 22.5726, "longitude": 88.3639, "capacity": 150}, # Kolkata
            {"id": 2, "latitude": 28.6139, "longitude": 77.2090, "capacity": 200}, # Delhi
            {"id": 3, "latitude": 19.0760, "longitude": 72.8777, "capacity": 250}  # Mumbai
        ]

    for node in active_nodes:
        lat = node.get("latitude") or node.get("lat") or 22.57
        lng = node.get("longitude") or node.get("lng") or 88.36
        capacity = node.get("capacity") or 100
        
        for day in range(days):
            day_of_week = day % 7
            for hour in range(24):
                # Peak hours simulation: 8-10 AM, 5-7 PM
                is_peak = (8 <= hour <= 10) or (17 <= hour <= 19)
                
                # Base volume logic
                if is_peak:
                    base_volume = 0.75 + np.random.uniform(-0.15, 0.15)
                else:
                    base_volume = 0.25 + np.random.uniform(-0.10, 0.10)
                
                # Weekend discount
                if day_of_week >= 5:
                    base_volume *= 0.65
                
                vehicle_count = int(max(0, min(capacity, capacity * base_volume)))
                
                # Speed calculations (inversely proportional to density)
                ratio = vehicle_count / capacity if capacity > 0 else 0
                avg_speed = max(5.0, round(60.0 * (1.0 - ratio) + np.random.uniform(-5, 5), 1))
                
                records.append({
                    "latitude": lat,
                    "longitude": lng,
                    "capacity": capacity,
                    "hour": hour,
                    "day_of_week": day_of_week,
                    "vehicle_count": vehicle_count,
                    "average_speed": avg_speed
                })
                
    return pd.DataFrame(records)


# ---------------- MODEL TRAINING ---------------- #
def train_model(active_nodes: list):
    """
    Trains the Random Forest model and saves it.
    """
    try:
        df = generate_training_data(active_nodes)
        
        # Features & Targets
        X = df[["latitude", "longitude", "capacity", "hour", "day_of_week"]]
        y = df[["vehicle_count", "average_speed"]]
        
        # Train Multi-output regressor
        model = RandomForestRegressor(n_estimators=50, random_state=42)
        model.fit(X, y)
        
        # Serialize model
        joblib.dump(model, MODEL_PATH)
        print("AI model trained and saved successfully at:", MODEL_PATH)
        return True
    except Exception as e:
        print(f"Error training AI model: {e}")
        return False


# ---------------- MODEL PREDICTIONS ---------------- #
def predict_traffic(latitude: float, longitude: float, capacity: int, hour: int, day_of_week: int):
    """
    Predicts vehicle count and average speed for a given segment and time.
    """
    if not os.path.exists(MODEL_PATH):
        # Return fallback mock predictions if model is not trained yet
        is_peak = (8 <= hour <= 10) or (17 <= hour <= 19)
        pred_count = int(capacity * (0.85 if is_peak else 0.35))
        pred_speed = 15.0 if is_peak else 42.0
        return pred_count, pred_speed

    try:
        model = joblib.load(MODEL_PATH)
        features = pd.DataFrame(
            [[latitude, longitude, capacity, hour, day_of_week]],
            columns=["latitude", "longitude", "capacity", "hour", "day_of_week"]
        )
        prediction = model.predict(features)[0]
        
        pred_count = int(max(0, min(capacity, prediction[0])))
        pred_speed = max(5.0, round(prediction[1], 1))
        
        return pred_count, pred_speed
    except Exception as e:
        print(f"Prediction error: {e}")
        is_peak = (8 <= hour <= 10) or (17 <= hour <= 19)
        return int(capacity * 0.4), 38.0
