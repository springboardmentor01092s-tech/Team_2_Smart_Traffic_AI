"""
Trains the Random Forest congestion-classification model used by
TrafficVision AI's Traffic Prediction module.

Usage:
    python train_model.py

Produces:
    models/traffic_model.pkl
    models/label_encoder.pkl
    models/feature_columns.json
"""

import json
import os

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report


# ==========================================================
# FEATURES USED BY THE MODEL
# ==========================================================

FEATURES = [
    "hour",
    "day_of_week",
    "month",
    "temperature",
    "rain",
    "snow",
    "clouds",
    "vehicle_count",
    "vehicle_speed",
]


# ==========================================================
# MODEL OUTPUT DIRECTORY
# ==========================================================

# train_model.py is located in:
# TrafficVision_Infosys_project/backend/ml/
#
# The application loads models from:
# TrafficVision_Infosys_project/models/

MODELS_DIR = os.path.join(
    os.path.dirname(__file__),
    "..",
    "..",
    "models",
)

os.makedirs(MODELS_DIR, exist_ok=True)


# ==========================================================
# TRAIN MODEL
# ==========================================================

def main():

    # ------------------------------------------------------
    # Load generated training data
    # ------------------------------------------------------

    df = pd.read_csv(
        os.path.join(
            os.path.dirname(__file__),
            "training_data.csv",
        )
    )

    print(f"Loaded {len(df)} training records.")

    print("\nTraining features:")
    print(FEATURES)

    # ------------------------------------------------------
    # Input features and target
    # ------------------------------------------------------

    X = df[FEATURES]
    y_raw = df["congestion_level"]

    # ------------------------------------------------------
    # Encode congestion labels
    # ------------------------------------------------------

    encoder = LabelEncoder()
    y = encoder.fit_transform(y_raw)

    # ------------------------------------------------------
    # Train/test split
    # ------------------------------------------------------

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    # ------------------------------------------------------
    # Random Forest model
    # ------------------------------------------------------

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced",
    )

    # ------------------------------------------------------
    # Train
    # ------------------------------------------------------

    model.fit(X_train, y_train)

    # ------------------------------------------------------
    # Evaluate
    # ------------------------------------------------------

    preds = model.predict(X_test)

    acc = accuracy_score(y_test, preds)

    print(f"\nTest accuracy: {acc:.3f}")

    print(
        classification_report(
            y_test,
            preds,
            target_names=encoder.classes_,
        )
    )

    # ------------------------------------------------------
    # Save trained model
    # ------------------------------------------------------

    joblib.dump(
        model,
        os.path.join(
            MODELS_DIR,
            "traffic_model.pkl",
        ),
    )

    # ------------------------------------------------------
    # Save label encoder
    # ------------------------------------------------------

    joblib.dump(
        encoder,
        os.path.join(
            MODELS_DIR,
            "label_encoder.pkl",
        ),
    )

    # ------------------------------------------------------
    # Save feature columns
    # ------------------------------------------------------

    with open(
        os.path.join(
            MODELS_DIR,
            "feature_columns.json",
        ),
        "w",
    ) as f:
        json.dump(FEATURES, f)

    # ------------------------------------------------------
    # Success message
    # ------------------------------------------------------

    print(
        "\nSaved successfully to:"
    )

    print(
        os.path.abspath(MODELS_DIR)
    )

    print(
        "\nSaved files:"
    )

    print("traffic_model.pkl")
    print("label_encoder.pkl")
    print("feature_columns.json")


# ==========================================================
# RUN
# ==========================================================

if __name__ == "__main__":
    main()

    